import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ApiProxy from "@/lib/api/django/backend.server";
import { ContestWorkspace } from "@/components/contests/ContestWorkspace";
import { SCORING_LABEL } from "@/lib/api/contests/contests";
import type { ContestFull } from "@/lib/api/contests/contest-actions";
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  cleanDescription,
} from "@/lib/seo/config";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Metadata uchun: foydalanuvchiga bog'liq EMAS (cookie yo'q), 30 soniya keshlanadi.
 * Foydalanuvchiga xos javobni keshlamaslik kerak, shuning uchun sahifa o'zi alohida,
 * `no-store` va auth bilan so'raydi.
 */
async function getContestForMeta(slug: string): Promise<ContestFull | null> {
  const res = await ApiProxy.get<ContestFull>(`/contests/${encodeURIComponent(slug)}`, {
    cache: "force-cache",
    next: { revalidate: 30 },
  });
  return res.status === 200 && res.data ? res.data : null;
}

async function getContestForUser(slug: string): Promise<ContestFull | null> {
  const res = await ApiProxy.get<ContestFull>(`/contests/${encodeURIComponent(slug)}`, {
    withAuth: true,
    cache: "no-store",
  });
  return res.status === 200 && res.data ? res.data : null;
}

/** Markdown/HTML tavsifdan SEO uchun oddiy matn ajratadi. */
function plainText(md: string): string {
  return md
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*_`>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildDescription(contest: ContestFull, maxLength: number): string {
  const fallback = `${contest.t} — ${SCORING_LABEL[contest.ct]} formatidagi dasturlash musobaqasi. ${SITE_NAME} platformasida qatnashing va bilimingizni sinang.`;
  return (contest.d ? cleanDescription(plainText(contest.d), maxLength) : "") || fallback;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const contest = await getContestForMeta(slug);

  if (!contest) {
    return { title: "Musobaqa topilmadi", robots: { index: false, follow: false } };
  }

  const title = `${contest.t} — Musobaqa`;
  const description = buildDescription(contest, 160);
  const url = absoluteUrl(`/contests/${contest.s}`);
  const ogImage = contest.v?.th || DEFAULT_OG_IMAGE;
  const isPrivate = contest.vis === "private";

  return {
    title,
    description,
    alternates: { canonical: `/contests/${contest.s}` },
    robots: isPrivate
      ? { index: false, follow: false }
      : {
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
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "uz_UZ",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${contest.t} — ${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [ogImage],
    },
  };
}

const EVENT_STATUS = {
  upcoming: "https://schema.org/EventScheduled",
  ongoing: "https://schema.org/EventMovedOnline",
  ended: "https://schema.org/EventCompleted",
} as const;

export default async function ContestPage({ params }: Props) {
  const { slug } = await params;
  const contest = await getContestForUser(slug);
  if (!contest) notFound();

  const contestUrl = absoluteUrl(`/contests/${contest.s}`);

  // Event sxemasi `tm.st` (boshlanish) bo'lgandagina chiqadi: Google startDate'siz qabul qilmaydi
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BreadcrumbList",
      "@id": `${contestUrl}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Bosh sahifa", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Musobaqalar", item: absoluteUrl("/contests") },
        { "@type": "ListItem", position: 3, name: contest.t, item: contestUrl },
      ],
    },
  ];

  if (contest.tm?.st && contest.vis !== "private") {
    graph.unshift({
      "@type": "EducationEvent",
      "@id": `${contestUrl}#event`,
      name: contest.t,
      description: buildDescription(contest, 500),
      url: contestUrl,
      startDate: contest.tm.st,
      endDate: contest.tm.et ?? undefined,
      eventStatus: EVENT_STATUS[contest.ss],
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: { "@type": "VirtualLocation", url: contestUrl },
      image: [contest.v?.th || DEFAULT_OG_IMAGE],
      organizer: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    });
  }

  const jsonLd = { "@context": "https://schema.org", "@graph": graph };

  return (
    <main className="min-h-screen bg-background px-3 py-6 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ContestWorkspace contest={contest} />
    </main>
  );
}
