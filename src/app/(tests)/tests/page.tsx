import type { Metadata } from "next";

import ApiProxy from "@/lib/api/django/backend.server";
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/config";
import {
  EMPTY_TEST_LIST,
  buildTestsQuery,
  parseOffset,
  parsePositiveInt,
  parseStatus,
  type TestListResponse,
  type TestSubject,
} from "@/lib/api/tests/tests";

import TestsListClient from "./TestsListClient";

const DESCRIPTION =
  "CFM Contest platformasida matematika va boshqa fanlardan testlarda qatnashing, bilimingizni sinang va natijalaringizni kuzating.";

export const metadata: Metadata = {
  title: "Testlar",
  description: DESCRIPTION,
  alternates: { canonical: "/tests" },
  openGraph: {
    title: `Testlar | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl("/tests"),
    siteName: SITE_NAME,
    locale: "uz_UZ",
    type: "website",
    images: [
      { url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — testlar` },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Testlar | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

interface PageProps {
  searchParams?: Promise<{
    status?: string;
    search?: string;
    fan?: string;
    offset?: string;
  }>;
}

export default async function TestsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const query = buildTestsQuery({
    status: parseStatus(params.status),
    search: params.search,
    fan: parsePositiveInt(params.fan),
    offset: parseOffset(params.offset),
  });

  const [testsRes, subjectsRes] = await Promise.all([
    ApiProxy.get<TestListResponse>(`/tests/?${query.toString()}`, {
      withAuth: true,
      timeoutMs: 5000,
    }),
    ApiProxy.get<TestSubject[]>("/tests/fan", { timeoutMs: 5000 }),
  ]);

  const ok = testsRes.status === 200 && testsRes.data;

  return (
    <TestsListClient
      initialTests={ok ? testsRes.data! : EMPTY_TEST_LIST}
      subjects={
        subjectsRes.status === 200 && Array.isArray(subjectsRes.data)
          ? subjectsRes.data
          : []
      }
      initialError={
        ok ? null : "Testlarni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring."
      }
    />
  );
}
