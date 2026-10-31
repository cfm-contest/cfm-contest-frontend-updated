import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import ApiProxy from "@/lib/api/django/backend.server";
import { SITE_NAME, DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo/config";
import type { TestDetailPayload } from "@/lib/api/tests/types";

import TestDetailClient from "./TestDetailClient";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ tab?: string }>;
}

const getTest = cache(async (slug: string) =>
  ApiProxy.get<TestDetailPayload>(`/tests/${encodeURIComponent(slug)}`, {
    withAuth: true,
    timeoutMs: 5000,
  }),
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const res = await getTest(slug);

  if (res.status !== 200 || !res.data) {
    return { title: "Test topilmadi", robots: { index: false } };
  }

  const test = res.data.item;
  const description =
    test.desc?.replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${test.t} — ${SITE_NAME} platformasidagi test.`;
  const image = test.img ?? DEFAULT_OG_IMAGE;
  const url = absoluteUrl(`/tests/${test.slug}`);

  return {
    title: test.t,
    description,
    alternates: { canonical: `/tests/${test.slug}` },
    openGraph: {
      title: `${test.t} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "uz_UZ",
      type: "website",
      images: [{ url: image, alt: test.t }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${test.t} | ${SITE_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function TestDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab } = (await searchParams) ?? {};
  const res = await getTest(slug);

  if (res.status === 404) notFound();

  if (res.status !== 200 || !res.data) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-sm text-slate-600">Testni yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.</p>
          <Link
            href="/tests"
            className="mt-4 inline-block text-sm font-semibold text-amber-700 underline underline-offset-4"
          >
            Testlar ro‘yxatiga qaytish
          </Link>
        </div>
      </main>
    );
  }

  return <TestDetailClient test={res.data.item} initialTab={tab} />;
}
