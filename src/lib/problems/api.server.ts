"use server";

import { cache } from "react";
import ApiProxy from "@/lib/api/django/backend.server";
import type {
  AdjacentProblem,
  ApiErrorResponse,
  Category,
  NavigationParams,
  ProblemDetail,
  ProblemStats,
  ProblemsResponse,
  ProblemsSearchParams,
  RandomProblem,
  RawProblemDetail,
  RawProblemsListResponse,
  SolutionVideoResponse,
  Tag,
} from "./types";
import { mapListResponse, mapProblemDetail } from "./transform";
import { EmbeddableProblem } from "./types_embeddable";

function encode(value: string | number): string {
  return encodeURIComponent(String(value));
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }

  const result = query.toString();
  return result ? `?${result}` : "";
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof (data as ApiErrorResponse).detail === "string"
  ) {
    return (data as ApiErrorResponse).detail;
  }
  return fallback;
}

/* ============================================================
   PROBLEM DETAIL
   Backend: GET /problems/{slug}/  (trailing slash bor)
============================================================ */

// generateMetadata + page body ikkalasi ham shu funksiyani
// chaqiradi — cache() bilan bitta requestga birlashtirilgan.
export const getProblem = cache(
  async (slug: string): Promise<ProblemDetail | null> => {
    try {
      const res = await ApiProxy.get<RawProblemDetail | ApiErrorResponse>(
        `/problems/${encode(slug)}/`,
        { withAuth: true, cache: "no-store" }
      );
      if (res.status === 404) return null;

      if (res.status >= 400 || !res.data) {
        return null;
      }

      const data = mapProblemDetail(res.data as RawProblemDetail)
      return data
    } catch {
      return null;
    }
  }
);

export async function getProblemOrThrow(slug: string): Promise<ProblemDetail> {
  const res = await ApiProxy.get<RawProblemDetail | ApiErrorResponse>(
    `/problems/${encode(slug)}/`,
    { withAuth: true, cache: "no-store" }
  );

  if (res.status === 404) throw new Error("PROBLEM_NOT_FOUND");

  if (res.status >= 400 || !res.data) {
    throw new Error(getErrorMessage(res.data, "Masalani yuklashda xatolik"));
  }

  return mapProblemDetail(res.data as RawProblemDetail);
}

/* ============================================================
   PROBLEMS LIST
   Backend: GET /problems/  (FilterParams: limit,offset,search,
   category_id,tag_id,difficulty,published_date,from_date,to_date)
============================================================ */

export async function getProblemsList(
  params: ProblemsSearchParams
): Promise<ProblemsResponse> {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const query = buildQuery({
    limit,
    offset,
    search: params.search,
    category_id: params.category_id,
    tag_id: params.tag_id,
    difficulty: params.difficulty,
    published_date: params.published_date,
    from_date: params.from_date,
    to_date: params.to_date,
  });

  const res = await ApiProxy.get<RawProblemsListResponse | ApiErrorResponse>(
    `/problems/${query}`,
    { withAuth: true, cache: "no-store" }
  );

  if (res.status >= 400 || !res.data || "detail" in res.data) {
    return { count: 0, limit, offset, data: [] };
  }

  return mapListResponse(res.data as RawProblemsListResponse);
}

/* ============================================================
   CATEGORIES
   Backend: GET /problems/categories/ -> {id,name,slug}[]
============================================================ */

export async function getCategories(): Promise<Category[]> {
  const res = await ApiProxy.get<Category[] | ApiErrorResponse>(
    `/problems/categories/`,
    { cache: "no-store" }
  );

  return res.status === 200 && Array.isArray(res.data) ? res.data : [];
}

/* ============================================================
   TAGS
   Backend: GET /problems/tags/ -> {id,name}[]
============================================================ */

export async function getTags(): Promise<Tag[]> {
  const res = await ApiProxy.get<Tag[] | ApiErrorResponse>(`/problems/tags/`, {
    cache: "no-store",
  });

  return res.status === 200 && Array.isArray(res.data) ? res.data : [];
}

/* ============================================================
   RANDOM PROBLEM
   Backend: GET /problems/random/?exclude_slug=  -> {slug,title}
============================================================ */

export async function getRandomProblem(
  excludeSlug?: string
): Promise<RandomProblem | null> {
  try {
    const query = buildQuery({ exclude_slug: excludeSlug });

    const res = await ApiProxy.get<RandomProblem | ApiErrorResponse>(
      `/problems/random/${query}`,
      { withAuth: true, cache: "no-store" }
    );

    if (res.status === 404) return null;

    if (res.status >= 400 || !res.data) {
      throw new Error(
        getErrorMessage(res.data, "Random masalani olishda xatolik")
      );
    }

    return res.data as RandomProblem;
  } catch {
    return null;
  }
}

/* ============================================================
   NAVIGATION
   Backend: GET /problems/{slug}/navigation/?direction=prev|next
   Har chaqiriqda FAQAT bitta qo'shni masala (flat {slug,title})
   qaytadi — {previous,next} EMAS. Topilmasa 404.
============================================================ */

export async function getProblemNavigation(
  slug: string,
  params: NavigationParams
): Promise<AdjacentProblem> {
  const query = buildQuery({ direction: params.direction });

  const res = await ApiProxy.get<AdjacentProblem | ApiErrorResponse>(
    `/problems/${encode(slug)}/navigation/${query}`,
    { withAuth: true, cache: "no-store" }
  );

  if (res.status >= 400 || !res.data) {
    throw new Error(
      getErrorMessage(res.data, "Navigatsiyani yuklashda xatolik")
    );
  }

  return res.data as AdjacentProblem;
}

/**
 * 404 bo'lsa (qo'shni masala yo'q) — xatolik tashlamay, null qaytaradi.
 */
export async function getAdjacentProblem(
  slug: string,
  direction: "next" | "prev"
): Promise<AdjacentProblem | null> {
  try {
    return await getProblemNavigation(slug, { direction });
  } catch {
    return null;
  }
}

/* ============================================================
   STATS
   Backend: GET /problems/stats/
============================================================ */

const EMPTY_STATS: ProblemStats = {
  total: 0,
  solved: 0,
  by_difficulty: {
    easy: { total: 0, solved: 0 },
    medium: { total: 0, solved: 0 },
    hard: { total: 0, solved: 0 },
  },
};

export async function getProblemStats(): Promise<ProblemStats> {
  const res = await ApiProxy.get<ProblemStats | ApiErrorResponse>(
    "/problems/stats/",
    { withAuth: true, cache: "no-store" }
  );

  if (res.status >= 400 || !res.data) {
    return EMPTY_STATS;
  }

  return res.data as ProblemStats;
}

/* ============================================================
   EMBEDDABLE
   Backend: GET /problems/embeddable/{slug}  (trailing slash YO'Q!)
============================================================ */

export async function getEmbeddableProblem(
  slug: string
): Promise<EmbeddableProblem> {
  const res = await ApiProxy.get<EmbeddableProblem | ApiErrorResponse>(
    `/problems/embeddable/${encode(slug)}`,
    { withAuth: true, cache: "no-store" }
  );

  if (res.status === 404) throw new Error("PROBLEM_NOT_FOUND");

  if (res.status >= 400 || !res.data) {
    throw new Error(
      getErrorMessage(res.data, "Embeddable masalani yuklashda xatolik")
    );
  }

  return res.data as EmbeddableProblem;
}

/* ============================================================
   SOLUTION VIDEO
   Backend: GET /problems/{slug}/hls/video/  (trailing slash bor)
============================================================ */

export async function getSolutionVideo(
  slug: string
): Promise<SolutionVideoResponse> {
  const res = await ApiProxy.get<SolutionVideoResponse | ApiErrorResponse>(
    `/problems/${encode(slug)}/hls/video/`,
    { withAuth: true, cache: "no-store" }
  );

  if (res.status === 404) throw new Error("VIDEO_NOT_FOUND");

  if (res.status >= 400 || !res.data) {
    throw new Error(
      getErrorMessage(res.data, "Solution videoni yuklashda xatolik")
    );
  }

  return res.data as SolutionVideoResponse;
}
