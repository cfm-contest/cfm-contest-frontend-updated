import { ContestTaskPage } from "@/components/contests/task/ContestTaskPage";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; alfa: string }>;
}) {
  const { slug, alfa } = await params;
  return <ContestTaskPage slug={slug} alfa={alfa} />;
}
