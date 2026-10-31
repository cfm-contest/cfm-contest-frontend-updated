// app/(courses)/courses/[slug]/test/[testSlug]/page.tsx

import { notFound } from "next/navigation";

import { getCourseDetail } from "@/lib/api/courses.server";
import { fetchTestInfo } from "@/lib/api/test-session.server";
import { TestPage } from "@/components/courses/test-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{
    slug: string;
    testSlug: string;
  }>;
}

export default async function Page({
  params,
}: Props) {
  const { slug, testSlug } = await params;

  const course = await getCourseDetail(slug);

  if (!course) {
    notFound();
  }

  const modul = course.modules.find(
    (item) => item.test?.slug === testSlug
  );

  if (!modul?.test) {
    notFound();
  }

  const isLoggedIn =
    course.user_progress !== undefined;

  if (!isLoggedIn) {
    notFound();
  }

  const isPaid =
    course.user_progress?.is_paid ?? false;

  const price =
    course.discount_price ?? course.price;

  const isFree = price <= 0;

  const paywallLocked =
    isLoggedIn && !isPaid && !isFree;

  const allLessonsDone =
    modul.total_lessons === 0 ||
    modul.lessons.every(
      (lesson) =>
        lesson.user_status?.is_completed ?? false
    );

  const locked =
    paywallLocked ||
    modul.locked ||
    !allLessonsDone;

  if (locked) {
    return (
          <main className="min-h-screen bg-white">
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
              <div className="flex min-h-[45vh] items-center justify-center">
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-5 py-8 text-center shadow-lg sm:px-8 sm:py-10">
                  
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 sm:h-16 sm:w-16">
                    <svg
                      className="h-6 w-6 text-gray-500 sm:h-7 sm:w-7"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="5"
                        y="11"
                        width="14"
                        height="10"
                        rx="2"
                      />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </div>

                  <h1 className="text-lg font-bold leading-tight text-gray-900 sm:text-xl">
                    Test hali qulflangan
                  </h1>

                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500 sm:text-base">
                    Avval moduldagi barcha darslarni tugating.
                  </p>
                </div>
              </div>
            </div>
          </main>

    );
  }

  const testInfo = await fetchTestInfo(modul.id);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <TestPage courseSlug={course.slug} testSlug={testSlug} modulId={modul.id} testInfo={testInfo} />
       </div>
    </main>
  );
}