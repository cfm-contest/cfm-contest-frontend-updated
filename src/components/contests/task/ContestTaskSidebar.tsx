"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContestTaskItem } from "@/lib/contests/types";

interface Props {
  slug: string;
  alfa: string;
  tasks: ContestTaskItem[];
  loading?: boolean;
}

export function ContestTaskSidebar({ slug, alfa, tasks, loading }: Props) {
  if (loading && tasks.length === 0) {
    return (
      <aside className="flex shrink-0 gap-2 p-2 md:w-[88px] md:flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 w-14 animate-pulse rounded-xl bg-neutral-200 md:w-full dark:bg-neutral-800"
          />
        ))}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Masalalar"
      className={cn(
        "flex shrink-0 gap-1.5 overflow-auto p-2",
        "md:w-[88px] md:flex-col md:overflow-y-auto md:overflow-x-hidden"
      )}
    >
      {tasks.map((task) => {
        const active = task.l.toLowerCase() === alfa.toLowerCase();

        return (
          <Link
            key={task.id}
            href={`/contests/${encodeURIComponent(slug)}/tasks/${encodeURIComponent(task.l)}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl transition md:h-[72px] md:w-full",
              active
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800",
              !active && task.st && "bg-emerald-50 dark:bg-emerald-950/30"
            )}
          >
            <span className="text-xl font-extrabold leading-none">{task.l}</span>
            <span
              className={cn(
                "mt-1 text-xs tabular-nums",
                active ? "text-blue-100" : "text-neutral-400"
              )}
            >
              {task.s}
            </span>

            {task.st && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-neutral-900">
                <Check className="size-3 stroke-[3]" />
              </span>
            )}
            {!task.st && task.tr && (
              <span
                title="Urinilgan"
                className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-400"
              />
            )}
          </Link>
        );
      })}
    </aside>
  );
}
