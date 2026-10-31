// app/(courses)/courses/[slug]/test/[testSlug]/result/[sessionId]/page.tsx

import { notFound, redirect } from "next/navigation";

import { getCourseDetail } from "@/lib/api/courses.server";
import { getTestSessionResult } from "@/lib/api/test-session.server";
import { TestResultPage } from "@/components/courses/test-result-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{
    slug: string;
    testSlug: string;
    sessionId: string;
  }>;
}

export default async function ResultPage({
  params,
}: Props) {
  const {
    slug,
    testSlug,
    sessionId,
  } = await params;

  /*
   * 1. Kursni olish
   */
  const course = await getCourseDetail(slug);

  if (!course) {
    notFound();
  }

  /*
   * 2. Modul/testni topish
   */
  const modul = course.modules.find(
    (item) => item.test?.slug === testSlug
  );

  if (!modul?.test) {
    notFound();
  }

  /*
   * 3. Login tekshirish
   */
  if (course.user_progress === undefined) {
    redirect(
      `/courses/${slug}/test/${testSlug}`
    );
  }

  /*
   * 4. Resultni olish
   */
  let result;

  try {
    result = await getTestSessionResult(sessionId);
  } catch {
    redirect(
      `/courses/${slug}/test/${testSlug}`
    );
  }

  /*
   * 5. Backenddan kelgan resultni tekshirish
   *
   * MUHIM:
   * finish endpoint 200 bo'lsa ham result endpoint
   * done false qaytarishi mumkin.
   *
   * Hozircha result sahifasini ko'rsatish uchun
   * avtomatik redirect qilmaymiz.
   */

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <TestResultPage
          result={result}
          courseSlug={course.slug}
          testSlug={testSlug}
        />
      </div>
    </main>
  );
}
