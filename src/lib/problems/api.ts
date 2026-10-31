"use client";

import { backendRequest } from "@/lib/api/django/backend";
import { mapListResponse } from "./transform";
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
  RunCodePayload,
  RunResponse,
  SolutionVideoResponse,
  SubmitCodePayload,
  SubmitCodeResult,
  Tag,
} from "./types";
import { EmbeddableProblem } from "./types_embeddable";

const API_BASE = "/api/problems";

/* ============================================================
   COMMON
============================================================ */

export class ApiError extends Error {
  status: number;
  data?: ApiErrorResponse;

  constructor(message: string, status: number, data?: ApiErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await backendRequest(url, options);

  if (!response.ok) {
    let data: ApiErrorResponse | undefined;

    try {
      data = await response.json();
    } catch {
      // Bo'sh / JSON bo'lmagan javob
    }

    throw new ApiError(
      data?.detail ?? `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* ============================================================
   PROBLEMS LIST
   Sahifaning o'zi (SSR) serverdagi api.server.ts orqali ishlaydi;
   bu funksiya faqat "Masalalar ro'yxati" panelidagi (client)
   qidiruv/paginatsiya uchun ishlatiladi.
============================================================ */

export async function getProblems(
  params: ProblemsSearchParams = {}
): Promise<ProblemsResponse> {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search.trim());
  if (params.category_id) query.set("category_id", String(params.category_id));
  if (params.tag_id) query.set("tag_id", String(params.tag_id));
  if (params.difficulty) query.set("difficulty", params.difficulty);
  if (params.published_date) query.set("published_date", params.published_date);
  if (params.from_date) query.set("from_date", params.from_date);
  if (params.to_date) query.set("to_date", params.to_date);

  query.set("limit", String(params.limit ?? 20));
  query.set("offset", String(params.offset ?? 0));

  const raw = await request<any>(
    `${API_BASE}/?${query.toString()}`
  );

  return mapListResponse(raw);
}

export const getProblemsList = getProblems;

/* ============================================================
   PROBLEM DETAIL (client-side qayta yuklash kerak bo'lganda)
============================================================ */

export async function getProblem(slug: string): Promise<ProblemDetail> {
  return request<ProblemDetail>(`${API_BASE}/${encodeURIComponent(slug)}/`);
}

/* ============================================================
   CATEGORIES / TAGS
============================================================ */

export async function getCategories(): Promise<Category[]> {
  return request<Category[]>(`${API_BASE}/category/`);
}

export async function getTags(): Promise<Tag[]> {
  return request<Tag[]>(`${API_BASE}/tags/`);
}

/* ============================================================
   RANDOM
============================================================ */

export async function getRandomProblem(
  excludeSlug?: string
): Promise<RandomProblem | null> {
  const query = excludeSlug
    ? `?exclude_slug=${encodeURIComponent(excludeSlug)}`
    : "";

  try {
    return await request<RandomProblem>(`${API_BASE}/random/${query}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}
/* ============================================================
   NAVIGATION
   Backend har chaqiriqda FAQAT bitta qo'shni masalani (flat
   {slug, title}) qaytaradi — direction'ga qarab prev YOKI next.
   Qo'shni topilmasa 404 qaytadi.
============================================================ */

export async function getProblemNavigation(
  slug: string,
  params: NavigationParams
): Promise<AdjacentProblem> {
  const query = new URLSearchParams({ direction: params.direction });

  return request<AdjacentProblem>(
    `${API_BASE}/${encodeURIComponent(slug)}/navigation/?${query.toString()}`
  );
}

/**
 * ProblemNavbar / ProblemWorkspace'dagi Oldingi/Keyingi tugmalari uchun.
 * 404 bo'lsa (qo'shni masala yo'q) — xatolik tashlamay, null qaytaradi.
 */
export async function getAdjacentProblem(
  slug: string,
  direction: "next" | "prev"
): Promise<AdjacentProblem | null> {
  try {
    return await getProblemNavigation(slug, { direction });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/* ============================================================
   STATS
============================================================ */

export async function getProblemStats(): Promise<ProblemStats> {
  return request<ProblemStats>(`${API_BASE}/stats/`);
}


/* ============================================================
   SUBMISSIONS (masalaga tegishli ro'yxat)
============================================================ */
/* ============================================================
   SUBMISSION DETAIL
   E'tibor bering: bu route /api/problems/* ostida emas,
   /api/user/submissions/{id} da yozilgan (tayyor route.ts).
============================================================ */


/* ============================================================
   SOLUTION VIDEO
============================================================ */

export async function getSolutionVideo(
  slug: string
): Promise<SolutionVideoResponse> {
  return request<SolutionVideoResponse>(
    `${API_BASE}/${encodeURIComponent(slug)}/hls/video/`
  );
}

/* ============================================================
   EMBEDDABLE
   Backend: GET /problems/embeddable/{slug}  (trailing slash YO'Q)
   Masalani boshqa saytga widget sifatida joylashtirish uchun.
============================================================ */

export async function getEmbeddableProblem(
  slug: string
): Promise<EmbeddableProblem> {
  return request<EmbeddableProblem>(
    `${API_BASE}/embeddable/${encodeURIComponent(slug)}`
  );
}

/* ============================================================
   CODE EXECUTION (Run) & SUBMIT
   Bular /api/problems/* ostida emas, alohida top-level
   /api/run va /api/submit route'lariga mos keladi.
============================================================ */

export async function runCode(payload: RunCodePayload): Promise<RunResponse> {
  return request<RunResponse>(`/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function submitCode(
  payload: SubmitCodePayload
): Promise<SubmitCodeResult> {
  return request<SubmitCodeResult>(`/api/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* ============================================================
   NOTIFICATIONS
   Diqqat: bu bo'lim "problems" domeniga aloqasi yo'q — lekin
   NotificationBell.tsx (global Navbar komponenti, barcha
   sahifalarda ko'rinadi) shu fayldan import qilinadi. Shu
   sababli bu yerda saqlanadi, olib tashlanmaydi.
============================================================ */

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface NotificationsResponse {
  count: number;
  unread_count: number;
  data: NotificationItem[];
}

export async function getNotifications(params?: {
  limit?: number;
  offset?: number;
}): Promise<NotificationsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params?.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();

  return request<NotificationsResponse>(
    `/api/notifications${query ? `?${query}` : ""}`
  );
}

export async function markNotificationsRead(ids?: number[]) {
  return request("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: ids ?? null }),
  });
}

export async function deleteNotification(id: number) {
  return request(`/api/notifications/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
  });
}

export async function clearAllNotifications() {
  return request("/api/notifications", {
    method: "DELETE",
  });
}
