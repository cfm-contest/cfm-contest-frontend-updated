import type { Metadata } from "next";

import { FeaturedCourseHero } from "@/components/courses/featured-course-hero";
import { CourseListGrid } from "@/components/courses/course-list-grid";
import { getCourseList, getHeroCourse } from "@/lib/api/courses.server";

import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_LOCALE,
  TWITTER_HANDLE,
  absoluteUrl,
} from "@/lib/seo/config";

import {
  courseListJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo/jsonld";

const PAGE_TITLE = "Barcha kurslar | CFM Contest";

const PAGE_DESCRIPTION =
  "Dasturlash va zamonaviy texnologiyalarni amaliyotda o‘rganing. CFM Contest platformasida amaliy kurslar orqali bilim va ko‘nikmalaringizni rivojlantiring.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: PAGE_TITLE,

    description: PAGE_DESCRIPTION,

    alternates: {
      canonical: "/courses",
    },

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
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: PAGE_DESCRIPTION,
      url: absoluteUrl("/courses"),
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — dasturlash kurslari`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: `${PAGE_TITLE} | ${SITE_NAME}`,
      description: PAGE_DESCRIPTION,
      creator: TWITTER_HANDLE,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function CoursesPage() {
  const [courses, heroCourse] = await Promise.all([
    getCourseList(),
    getHeroCourse(),
  ]);

  const listSchema = courseListJsonLd(courses);

  const crumbsSchema = breadcrumbJsonLd([
    {
      name: "Bosh sahifa",
      url: "/",
    },
    {
      name: PAGE_TITLE,
      url: "/courses",
    },
  ]);

  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 dark:bg-black dark:text-zinc-100 sm:py-12">
      {/* SEO: Course list structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(listSchema),
        }}
      />

      {/* SEO: Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(crumbsSchema),
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 sm:mb-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
              Onlayn ta‘lim
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              {courses.length} ta mavjud kurs
            </span>
          </div>

          <h1 className="mt-4 font-display text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {PAGE_TITLE}
          </h1>

          <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-zinc-400 sm:text-base">
            {PAGE_DESCRIPTION}
          </p>
        </header>

        {heroCourse && (
          <section
            aria-label="Tavsiya etilgan kurs"
            className="mb-12"
          >
            <FeaturedCourseHero hero={heroCourse} />
          </section>
        )}

        {courses.length > 0 ? (
          <section aria-label="Kurslar ro‘yxati">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Barcha ta‘lim kurslari
              </h2>
            </div>
            <CourseListGrid courses={courses} />
          </section>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/80 bg-white px-6 py-16 text-center dark:border-white/10 dark:bg-zinc-900">
            <p className="text-base font-bold text-slate-900 dark:text-white">
              Hozircha kurslar mavjud emas
            </p>

            <p className="max-w-md text-sm text-slate-500 dark:text-zinc-400">
              Tez orada yangi chuqurlashtirilgan video kurslar va amaliy laboratoriyalar qo‘shiladi — qayta tekshirib turing.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
