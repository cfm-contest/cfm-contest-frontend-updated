"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { AlertTriangle, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  ContestApiError,
  getContestTask,
  getContestTasks,
} from "@/lib/contests/api";
import { ContestTaskSidebar } from "./ContestTaskSidebar";
import { ContestProblemView } from "./ContestProblemView";
import { ContestQuestionView } from "./ContestQuestionView";
import { ContestTaskHeader } from "./ContestTaskHeader";
import {
  HeaderSkeleton,
  ProblemSkeleton,
  QuestionSkeleton,
} from "./ContestTaskSkeletons";

export function ContestTaskPage({ slug, alfa }: { slug: string; alfa: string }) {
  const { isAuthenticated, isLoading: authLoading, loginRequiredRedirect } = useAuth();
  const ready = !authLoading && isAuthenticated;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) loginRequiredRedirect();
  }, [authLoading, isAuthenticated, loginRequiredRedirect]);

  const onError = useCallback(
    (err: unknown) => {
      if (err instanceof ContestApiError && err.code === "login_required") {
        loginRequiredRedirect();
      }
    },
    [loginRequiredRedirect],
  );

  // Ro'yxat bitta kalit bilan keshlanadi: harflar orasida o'tganda qayta yuklanmaydi.
  const { data: list, mutate: mutateList } = useSWR(
    ready ? ["contest-tasks", slug] : null,
    () => getContestTasks(slug),
    {
      // Fokusga qaytganda vaqt/holat qayta sinxronlanadi
      revalidateOnFocus: true,
      dedupingInterval: 10_000,
      keepPreviousData: true,
      onError,
    },
  );

  const {
    data: task,
    error,
    isLoading,
    mutate: mutateTask,
  } = useSWR(ready ? ["contest-task", slug, alfa] : null, () => getContestTask(slug, alfa), {
    revalidateOnFocus: false,
    onError,
  });

  const refresh = useCallback(() => {
    void mutateList();
    void mutateTask();
  }, [mutateList, mutateTask]);

  const canSubmit = list ? list.can_submit : true; // yakuniy qaror — backendda
  const mode = list?.mode ?? "contest";
  const current = list?.tasks.find((t) => t.l.toLowerCase() === alfa.toLowerCase());

  let content: React.ReactNode;

  if (!ready || (isLoading && !task)) {
    content = current?.k === "t" ? <QuestionSkeleton /> : <ProblemSkeleton />;
  } else if (error || !task) {
    const err = error as ContestApiError | undefined;
    const isPhase = err?.code?.startsWith("phase_");
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        {isPhase ? (
          <Lock className="size-10 text-amber-400" />
        ) : (
          <AlertTriangle className="size-10 text-red-300" />
        )}
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {err?.message ?? "Vazifani yuklab bo'lmadi."}
        </p>
        {err?.code && <code className="text-xs text-neutral-400">{err.code}</code>}
        <button
          type="button"
          onClick={() => mutateTask()}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Qayta urinish
        </button>
      </div>
    );
  } else if (task.type === "problem") {
    content = (
      <ContestProblemView
        key={`${slug}:${alfa}`}
        slug={slug}
        alfa={task.l}
        data={task.data}
        owner={task.owner}
        maxScore={task.ms}
        mode={mode}
        canSubmit={canSubmit}
        onSubmitted={refresh}
      />
    );
  } else {
    const idx = list?.tasks.findIndex((t) => t.l.toLowerCase() === alfa.toLowerCase()) ?? -1;
    const next = idx >= 0 ? list?.tasks[idx + 1] : undefined;
    const base = `/contests/${encodeURIComponent(slug)}`;

    content = (
      <ContestQuestionView
        key={`${slug}:${alfa}`}
        slug={slug}
        letter={task.l}
        maxScore={task.ms}
        data={task.data}
        canSubmit={canSubmit}
        closed={Boolean(current?.cl)}
        nextHref={next ? `${base}/tasks/${encodeURIComponent(next.l)}` : null}
        backHref={base}
        onAnswered={refresh}
      />
    );
  }

  return (
    <div className="flex h-[calc(100dvh-var(--contest-nav-h,4.5rem))] min-h-0 flex-col bg-neutral-50 dark:bg-neutral-900">
      {list ? (
        <ContestTaskHeader
          slug={slug}
          info={list}
          tasks={list.tasks}
          isProblem={task?.type === "problem"}
          onTimeUp={() => void mutateList()}
        />
      ) : (
        <HeaderSkeleton />
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <ContestTaskSidebar slug={slug} alfa={alfa} tasks={list?.tasks ?? []} loading={!list} />
        <main className="min-h-0 min-w-0 flex-1 p-2 md:pl-0">{content}</main>
      </div>
    </div>
  );
}
