import type { Metadata } from "next";
import TestRunner from "./TestRunner";

export const metadata: Metadata = {
  title: "Test topshirish",
  robots: { index: false, follow: false },
};

export default async function TestTasksPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TestRunner slug={slug} />;
}
