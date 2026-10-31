// app/(courses)/courses/[slug]/test/[testSlug]/question/layout.tsx

import { notFound } from "next/navigation";

import { getCourseDetail } from "@/lib/api/courses.server";
import { TestSessionPage } from "@/components/courses/test-session-view";

interface Props {
  children: React.ReactNode;
  params: Promise<{
    slug: string;
    testSlug: string;
  }>;
}

export default async function QuestionLayout({
  children,
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

  return (
    <TestSessionPage
      modulId={modul.id}
      courseSlug={course.slug}
      testSlug={testSlug}
    >
      {children}
    </TestSessionPage>
  );
}