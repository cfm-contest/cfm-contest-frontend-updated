import { ContestWorkspaceSkeleton } from "@/components/contests/ContestSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-3 py-6 sm:px-6 sm:py-10 lg:px-8">
      <ContestWorkspaceSkeleton />
    </main>
  );
}
