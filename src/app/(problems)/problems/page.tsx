import type { Metadata } from "next";
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/config";
import ApiProxy from "@/lib/api/django/backend.server";
import { mapListResponse } from "@/lib/problems/transform";
import type {
  RawProblemsListResponse,
  ApiErrorResponse,
  Category,
  Tag,
  ProblemStats,
} from "@/lib/problems/types";
import ProblemsListClient from "./ProblemsListClient";

const DESCRIPTION =
  "FAANG (Google, Meta, Amazon, Apple, Netflix) va yetakchi IT kompaniyalar texnik intervyulari uchun algoritmik masalalar to‘plami. Ma'lumotlar tuzilmalari, dinamik dasturlash va musobaqalar uchun online kod muharriri.";

export const metadata: Metadata = {
  title: "Algoritmik Masalalar va FAANG Intervyu Savollari",
  description: DESCRIPTION,
  alternates: { canonical: "/problems" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: `Algoritmik Masalalar va FAANG Intervyu Savollari | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/problems"),
    siteName: SITE_NAME,
    locale: "uz_UZ",
    type: "website",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — FAANG algoritmik masalalar` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Algoritmik Masalalar va FAANG Intervyu Savollari | ${SITE_NAME}`,
    description: DESCRIPTION,
    creator: "@cfm_contest_uz",
    images: [DEFAULT_OG_IMAGE],
  },
};

interface PageProps {
  searchParams?: Promise<{
    page?: string;
    search?: string;
    category_id?: string;
    tag_id?: string;
    difficulty?: string;
    from_date?: string;
    to_date?: string;
  }>;
}

const DEFAULT_LIMIT = 20;

export default async function ProblemsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (page - 1) * DEFAULT_LIMIT;

  const sp = new URLSearchParams();
  sp.set("limit", String(DEFAULT_LIMIT));
  sp.set("offset", String(offset));
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.category_id) sp.set("category_id", params.category_id);
  if (params.tag_id) sp.set("tag_id", params.tag_id);
  if (params.difficulty) sp.set("difficulty", params.difficulty);
  if (params.from_date) sp.set("from_date", params.from_date);
  if (params.to_date) sp.set("to_date", params.to_date);

  // Parallel so'rovlar
  const [problemsRes, categoriesRes, tagsRes, statsRes] = await Promise.all([
    ApiProxy.get<RawProblemsListResponse | ApiErrorResponse>(`/problems/?${sp.toString()}`, {
      withAuth: true,
      cache: "no-store",
    }),
    // Kategoriya va Taglar tez-tez o'zgarmasligi sababli revalidate / kesh qo'llash tavsiya etiladi
    ApiProxy.get<Category[]>(`/problems/categories/`, { next: { revalidate: 3600 } }),
    ApiProxy.get<Tag[]>(`/problems/tags/`, { next: { revalidate: 3600 } }),
    ApiProxy.get<ProblemStats>(`/problems/stats/`, { withAuth: true, cache: "no-store" }),
  ]);

  const initialProblems =
    problemsRes.status === 200 && problemsRes.data && !("detail" in problemsRes.data)
      ? mapListResponse(problemsRes.data as RawProblemsListResponse)
      : { count: 0, limit: DEFAULT_LIMIT, offset: 0, data: [] };

  const categories = categoriesRes.status === 200 && categoriesRes.data ? categoriesRes.data : [];
  const tags = tagsRes.status === 200 && tagsRes.data ? tagsRes.data : [];
  const stats =
    statsRes.status === 200 && statsRes.data
      ? statsRes.data
      : {
          total: 0,
          solved: 0,
          by_difficulty: {
            easy: { total: 0, solved: 0 },
            medium: { total: 0, solved: 0 },
            hard: { total: 0, solved: 0 },
          },
        };

  return (
    <ProblemsListClient
      initialProblems={initialProblems}
      categories={categories}
      tags={tags}
      initialStats={stats}
      currentPage={page}
    />
  );
}
