import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CourseHero } from "@/components/courses/course-hero";
import { CourseCurriculum } from "@/components/courses/course-curriculum";
import { CourseSidebar } from "@/components/courses/course-sidebar";
import { CourseFaq } from "@/components/courses/course-faq";

import { getCourseDetail, getCourseDetailWithStatus } from "@/lib/api/courses.server";

import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_LOCALE,
  TWITTER_HANDLE,
  absoluteUrl,
  cleanDescription,
} from "@/lib/seo/config";

import {
  courseJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo/jsonld";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const course = await getCourseDetail(slug);

  if (!course) {
    return {
      title: "Kurs topilmadi",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description =
    cleanDescription(course.description, 160) ||
    `${course.title} — ${SITE_NAME} platformasidagi dasturlash va zamonaviy texnologiyalar bo‘yicha onlayn kurs.`;

  const url = absoluteUrl(`/courses/${course.slug}`);

  const ogImage = course.video?.thumbnail
    ? absoluteUrl(course.video.thumbnail)
    : DEFAULT_OG_IMAGE;

  return {
    title: course.title,

    description,

    alternates: {
      canonical: `/courses/${course.slug}`,
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
      title: `${course.title} | ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${course.title} — ${SITE_NAME}`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: `${course.title} | ${SITE_NAME}`,
      description,
      creator: TWITTER_HANDLE,
      images: [ogImage],
    },
  };
}

export default async function CourseDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const { data: course, status } = await getCourseDetailWithStatus(slug);

  if (status === 401 || status === 403) {
    redirect(`/login?next=${encodeURIComponent(`/courses/${slug}`)}`);
  }

  if (!course) {
    notFound();
  }

  const isPaid = Boolean(course.user_progress?.is_paid);
  const isLoggedIn = Boolean(course.user_progress);

  const firstLessonSlug =
    course.modules?.[0]?.lessons?.[0]?.slug;

  const courseSchema = courseJsonLd(course);

 const crumbsSchema = breadcrumbJsonLd([
  {
    name: "Bosh sahifa",
    url: "/",
  },
  {
    name: "Kurslar",
    url: "/courses",
  },
  {
    name: course.title,
    url: `/courses/${course.slug}`,
  },
]);

  return (
    <main className="min-h-screen">
      {/* SEO: Course structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(courseSchema),
        }}
      />

      {/* SEO: Breadcrumb structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(crumbsSchema),
        }}
      />

      {/* Hero */}
      <CourseHero
        course={course}
        isPaid={isPaid}
        isLoggedIn={isLoggedIn}
        firstLessonSlug={firstLessonSlug}
        courseSlug={course.slug}
        progress={course.user_progress ?? null}
      />

      {/* Main Content & Sidebar */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="flex flex-col gap-12">
            {/* Curriculum */}
            <section id="curriculum">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold tracking-tight">
                  Kurs dasturi
                </h2>
              </div>

              <CourseCurriculum
                modules={course.modules}
                courseSlug={course.slug}
                isPaid={isPaid}
                isLoggedIn={isLoggedIn}
                isFree={course.price <= 0}
              />
            </section>

            {/* FAQ */}
            <CourseFaq />
          </div>

          {/* Sticky Sidebar */}
          <div className="lg:relative">
            <div className="sticky top-6">
              <CourseSidebar
                course={course}
                isPaid={isPaid}
                isLoggedIn={isLoggedIn}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
