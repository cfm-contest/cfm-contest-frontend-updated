// app/contests/page.tsx
import type { Metadata } from "next";

import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/config";
import ApiProxy from "@/lib/api/django/backend.server";

import ContestListClient from "./ContestListClient";

import type {
  CompactContestResponse,
  ContestStatus,
  ContestType,
} from "@/lib/api/contests/contests";

const DESCRIPTION =
  "CFM Contest platformasida dasturlash musobaqalarida qatnashing, algoritmik bilimlaringizni sinang va reytingingizni oshiring.";

export const metadata: Metadata = {
  title: "Musobaqalar",
  description: DESCRIPTION,
  alternates: { canonical: "/contests" },
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
    title: `Musobaqalar | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/contests"),
    siteName: SITE_NAME,
    locale: "uz_UZ",
    type: "website",
    images: [
      { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — musobaqalar` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Musobaqalar | ${SITE_NAME}`,
    description: DESCRIPTION,
    creator: "@cfm_contest_uz",
    images: [DEFAULT_OG_IMAGE],
  },
};

interface PageProps {
  searchParams?: Promise<{ type?: string; status?: string; search?: string }>;
}

const PAGE_SIZE = 20;
const CONTEST_TYPES: readonly ContestType[] = ["public", "gym", "private"];
const CONTEST_STATUSES: readonly ContestStatus[] = ["upcoming", "ongoing", "ended"];

const isContestType = (v: string): v is ContestType => CONTEST_TYPES.includes(v as ContestType);
const isContestStatus = (v: string): v is ContestStatus =>
  CONTEST_STATUSES.includes(v as ContestStatus);

export default async function ContestsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const rawType = params.type;
  const rawStatus = params.status;
  const rawSearch = params.search;

  const type: ContestType =
    rawType && rawType !== "undefined" && isContestType(rawType) ? rawType : "public";
  const status: ContestStatus | undefined =
    rawStatus && rawStatus !== "undefined" && isContestStatus(rawStatus) ? rawStatus : undefined;
  const search = rawSearch && rawSearch !== "undefined" ? rawSearch.trim() : "";

  const sp = new URLSearchParams({ limit: String(PAGE_SIZE), offset: "0", type });
  if (status) sp.set("status", status);
  if (search) sp.set("search", search);

  const res = await ApiProxy.get<CompactContestResponse>(`/contests/?${sp.toString()}`, {
    withAuth: true,
    cache: "no-store",
    timeoutMs: 5000,
  });

  const initialContests: CompactContestResponse =
    res.status === 200 && res.data
      ? res.data
      : { hn: false, no: null, sn: new Date().toISOString(), rs: [] };

  return (
    <ContestListClient
      initialContests={initialContests}
      currentType={type}
      currentStatus={status}
      currentSearch={search}
    />
  );
}
