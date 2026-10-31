import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getProblem } from "@/lib/problems/api.server";
import type { ProblemDetail } from "@/lib/problems/types";
import { DIFFICULTY_LABELS } from "@/lib/problems/utils";
import { ProblemWorkspace } from "@/components/problems/problem-workspace";

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
 * `problem.desc` faqat `hasAccess: true` (unlocked) holatda mavjud —
 * Premium va foydalanuvchida ruxsat bo'lmasa backend uni umuman
 * qaytarmaydi. Shu sababli SEO description'ni har doim xavfsiz,
 * `hasAccess`ga bog'liq holda hosil qilamiz.
 */
function buildDescription(problem: ProblemDetail, maxLength: number): string {
  const difficultyLabel = DIFFICULTY_LABELS[problem.difficulty] ?? problem.difficulty;

  const fallback = problem.category
    ? `${problem.title} — ${difficultyLabel} darajali "${problem.category}" bo'yicha FAANG va yetakchi IT kompaniyalar texnik intervyu algoritmi masalasi. CFM platformasida online muharrirda yeching.`
    : `${problem.title} — ${difficultyLabel} darajali FAANG va IT kompaniyalar texnik intervyusi uchun algoritmik masala. CFM platformasida online yeching.`;

  if (!problem.hasAccess) {
    return fallback;
  }

  return cleanDescription(problem.desc, maxLength) || fallback;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;

  const problem = await getProblem(slug);

  if (!problem) {
    return {
      title: "Masala topilmadi",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${problem.title} — Algoritmik Masala & FAANG Intervyu`;

  const description = buildDescription(problem, 160);

  const url = absoluteUrl(`/problem/${problem.slug}`);

  return {
    title,
    description,

    alternates: {
      canonical: `/problem/${problem.slug}`,
    },

    // Premium (locked) masalalarni qidiruv tizimlari indekslamasin —
    // ular uchun to'liq kontent mavjud emas, faqat "sotib olish" sahifasi.
    robots: problem.hasAccess
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: true,
        },

    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: "uz_UZ",
      type: "article",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${problem.title} — ${SITE_NAME}`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function ProblemPage({ params }: Props) {
  const { slug } = await params;

  const problem = await getProblem(slug);

  if (!problem) {
    notFound();
  }

  const problemUrl = absoluteUrl(`/problem/${problem.slug}`);

  const description = buildDescription(problem, 500);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LearningResource",
        "@id": `${problemUrl}#learning-resource`,
        name: problem.title,
        description,
        url: problemUrl,
        educationalLevel: problem.difficulty,
        learningResourceType: "Programming problem",
        isAccessibleForFree: !problem.premium,

        ...(problem.category
          ? {
              about: {
                "@type": "Thing",
                name: problem.category,
              },
            }
          : {}),

        provider: {
          "@type": "Organization",
          name: SITE_NAME,
          url: absoluteUrl("/"),
        },
      },

      {
        "@type": "BreadcrumbList",
        "@id": `${problemUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Bosh sahifa",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Masalalar",
            item: absoluteUrl("/problems"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: problem.title,
            item: problemUrl,
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <ProblemWorkspace problem={problem} />
    </main>
  );
}