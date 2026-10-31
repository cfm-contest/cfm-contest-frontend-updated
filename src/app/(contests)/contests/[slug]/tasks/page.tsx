"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, Lock } from "lucide-react";
import { getContestTasks, ContestApiError } from "@/lib/contests/api";
import { useAuth } from "@/context/AuthContext";
import {
  HeaderSkeleton,
  ProblemSkeleton,
  SidebarSkeleton,
} from "@/components/contests/task/ContestTaskSkeletons";

/**
 * /contests/{slug}/tasks  →  birinchi vazifaga yo'naltiradi (/contests/{slug}/tasks/A).
 * Vazifalar yo'q bo'lsa (faza yopiq va hokazo) sababini ko'rsatadi.
 */
export default function ContestTasksIndex({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, loginRequiredRedirect } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) loginRequiredRedirect();
  }, [authLoading, isAuthenticated, loginRequiredRedirect]);

  const { data, error } = useSWR(
    !authLoading && isAuthenticated ? ["contest-tasks", slug] : null,
    () => getContestTasks(slug),
    { revalidateOnFocus: false },
  );

  const first = data?.tasks[0];

  useEffect(() => {
    if (first) {
      router.replace(`/contests/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(first.l)}`);
    }
  }, [first, router, slug]);

  if (error || (data && !first)) {
    const err = error as ContestApiError | undefined;
    const closed = !error && data && !data.can_submit;
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        {closed ? (
          <Lock className="size-10 text-amber-400" />
        ) : (
          <AlertTriangle className="size-10 text-red-300" />
        )}
        <p className="text-base font-semibold">
          {err?.message ?? "Hozircha bu contestda ko'rinadigan vazifalar yo'q."}
        </p>
        {data?.phase && <code className="text-xs text-neutral-400">{data.phase}</code>}
      </div>
    );
  }

  // Yo'naltirilguncha skeleton
  return (
    <div className="flex h-[calc(100dvh-var(--contest-nav-h,4.5rem))] flex-col bg-neutral-50 dark:bg-neutral-900">
      <HeaderSkeleton />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <SidebarSkeleton />
        <main className="min-h-0 flex-1 p-2 md:pl-0">
          <ProblemSkeleton />
        </main>
      </div>
    </div>
  );
}
