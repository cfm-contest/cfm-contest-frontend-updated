"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crown,
  Loader2,
  Send,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContestTaskItem, ContestTasksResponse } from "@/lib/contests/types";
import { formatCountdown, useCountdown } from "./useCountdown";

// Natijalar sahifasi manzilini loyihangizga moslang.
const standingsHref = (slug: string) => `/contests/${encodeURIComponent(slug)}/standings`;

type Phase = "upcoming" | "running" | "ended" | "unknown";

function statusOf(raw?: string): Phase {
  const s = (raw ?? "").toLowerCase();
  if (/upcom|sched|pend|soon|not_?start/.test(s)) return "upcoming";
  if (/run|live|activ|progress|going/.test(s)) return "running";
  if (/end|finish|over|clos/.test(s)) return "ended";
  return "unknown";
}

const STATUS_UI: Record<Phase, { label: string; cls: string; timer?: string }> = {
  upcoming: {
    label: "Boshlanmagan",
    cls: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    timer: "Boshlanishiga",
  },
  running: {
    label: "Davom etmoqda",
    cls: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    timer: "Tugashiga",
  },
  ended: {
    label: "Tugagan",
    cls: "border-neutral-200 bg-neutral-100 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  },
  unknown: { label: "", cls: "" },
};

interface Props {
  slug: string;
  info?: ContestTasksResponse;
  tasks: ContestTaskItem[];
  /** Hozirgi vazifa kod masalasimi (Yuborish tugmasi faqat shunda) */
  isProblem: boolean;
  onTimeUp: () => void;
}

export function ContestTaskHeader({ slug, info, tasks, isProblem, onTimeUp }: Props) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const on = (e: Event) => setSubmitting(Boolean((e as CustomEvent).detail));
    window.addEventListener("contest:submitting", on);
    return () => window.removeEventListener("contest:submitting", on);
  }, []);

  const phase = statusOf(info?.status);
  const ui = STATUS_UI[phase];
  const left = useCountdown(info?.time_left, info, onTimeUp);

  const total = tasks.length;
  const solved = tasks.filter((t) => t.st).length;
  const score = tasks.reduce((sum, t) => sum + (t.us || 0), 0);
  const maxScore = tasks.reduce((sum, t) => sum + (t.s || 0), 0);
  const pct = total ? Math.round((solved / total) * 100) : 0;

  const isPractice = info?.mode === "practice";
  const isTeam = /team|jamo/i.test(info?.kind ?? "") || /team|jamo/i.test(info?.ct ?? "");
  const canSubmit = info ? info.can_submit : true;

  return (
    <header className="shrink-0 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#0f172a]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
        <Link
          href={`/contests/${encodeURIComponent(slug)}`}
          aria-label="Contestga qaytish"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800"
        >
          <ArrowLeft className="size-4" />
        </Link>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {info?.title ?? "Contest"}
          </h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            {ui.label && (
              <Badge variant="outline" className={cn("px-2 py-0 text-[11px]", ui.cls)}>
                {ui.label}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "px-2 py-0 text-[11px]",
                isPractice
                  ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
                  : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-300"
              )}
              title={
                isPractice
                  ? "Mashq rejimi: natija reytingga ta'sir qilmaydi"
                  : "Rasmiy rejim: natija reytingga yoziladi"
              }
            >
              {isPractice ? "Mashq" : "Rasmiy"}
            </Badge>
            {info?.role && (
              <Badge variant="outline" className="gap-1 px-2 py-0 text-[11px]">
                {info.role === "captain" ? <Crown className="size-3" /> : <Users className="size-3" />}
                {info.role === "captain" ? (isTeam ? "Sardor" : "Ishtirokchi") : "Jamoa a'zosi"}
              </Badge>
            )}
            {!canSubmit && (
              <Badge className="border border-amber-200 bg-amber-50 px-2 py-0 text-[11px] text-amber-700 hover:bg-amber-50">
                Yuborish yopiq
              </Badge>
            )}
          </div>
        </div>

        <Link
          href={standingsHref(slug)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Trophy className="size-4 text-amber-500" />
          Natijalar
        </Link>

        {left !== null && phase !== "ended" && (
          <div
            className="flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400"
            title={ui.timer}
          >
            <Timer className="size-4" />
            {formatCountdown(left)}
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          {total > 0 && (
            <div className="hidden min-w-[150px] sm:block">
              <div className="mb-1 flex justify-between text-[11px] tabular-nums text-neutral-500">
                <span>
                  {solved}/{total} yechilgan
                </span>
                <span className="font-semibold text-neutral-700 dark:text-neutral-200">
                  {score}/{maxScore}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {isProblem && (
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => window.dispatchEvent(new Event("contest:submit"))}
              className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Yuborish
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
