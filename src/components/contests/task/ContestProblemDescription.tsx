"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock,
  Copy,
  HardDrive,
  Lightbulb,
  ListChecks,
  Target,
  User,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_CLASSES, DIFFICULTY_LABELS } from "@/lib/problems/utils";
import { cn } from "@/lib/utils";
import type { ContestOwner, ContestProblemData } from "@/lib/contests/types";

type Tab = "description" | "hints" | "challenges";

interface Props {
  data: ContestProblemData;
  owner: ContestOwner;
  maxScore: number;
  /** contest rejimida maslahat/talablar yashiriladi */
  showExtras: boolean;
}

export function ContestProblemDescription({ data, owner, maxScore, showExtras }: Props) {
  const [tab, setTab] = useState<Tab>("description");
  const [fontSize, setFontSize] = useState(15);

  const hints = showExtras ? data.hints : [];
  const challenges = showExtras ? data.chall : [];
  const diffKey = String(data.dif);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white dark:bg-[#0f172a]">
      {(hints.length > 0 || challenges.length > 0) && (
        <div className="flex shrink-0 gap-0.5 overflow-x-auto border-b border-neutral-200 px-1 dark:border-neutral-800">
          <Tab active={tab === "description"} onClick={() => setTab("description")} label="Tavsif" />
          {hints.length > 0 && (
            <Tab active={tab === "hints"} onClick={() => setTab("hints")} label="Maslahatlar" count={hints.length} />
          )}
          {challenges.length > 0 && (
            <Tab active={tab === "challenges"} onClick={() => setTab("challenges")} label="Talablar" count={challenges.length} />
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" style={{ fontSize }}>
        {tab === "description" && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <Chip icon={<Clock className="size-3.5" />}>Vaqt: {data.time_l} ms</Chip>
              <Chip icon={<HardDrive className="size-3.5" />}>Xotira: {data.memory_l} MB</Chip>
              <Chip icon={<Target className="size-3.5" />}>Ball: {maxScore}</Chip>
              <Chip icon={<User className="size-3.5" />}>Muallif: {owner.full_name}</Chip>
            </div>

            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                  {data.title}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {(DIFFICULTY_LABELS as any)?.[diffKey] && (
                    <Badge className={`border px-2.5 py-0.5 text-xs ${(DIFFICULTY_CLASSES as any)?.[diffKey] ?? ""}`}>
                      {(DIFFICULTY_LABELS as any)[diffKey]}
                    </Badge>
                  )}
                  {data.cate_name && (
                    <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
                      {data.cate_name}
                    </Badge>
                  )}
                  {data.tags.map((t) => (
                    <Badge key={t.id} variant="outline" className="px-2.5 py-0.5 text-xs font-normal">
                      #{t.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {data.solved && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <BadgeCheck className="size-4" />
                  Yechilgan
                </div>
              )}
            </div>

            <MarkdownRenderer content={data.desc} />

            {data.exam.length > 0 && <Samples exam={data.exam} />}
          </>
        )}

        {tab === "hints" &&
          hints.map((h, i) => (
            <div
              key={h.id}
              className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300"
            >
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                <Lightbulb className="size-4" />
                Maslahat {i + 1}
              </div>
              <MarkdownRenderer content={h.text} />
            </div>
          ))}

        {tab === "challenges" && (
          <ul className="space-y-3">
            {challenges.map((c, i) => (
              <li
                key={c.id}
                className="flex gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <ListChecks className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <div>
                  <span className="mr-1 font-semibold">{i + 1}.</span>
                  <MarkdownRenderer content={c.text} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-neutral-200 px-3 py-2 text-xs dark:border-neutral-800">
        <span className="text-neutral-400">
          {data.acceptance > 0 ? `Qabul qilinish: ${data.acceptance}%` : "\u00A0"}
        </span>
        <div className="flex items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100 px-1.5 py-0.5 dark:border-slate-700/50 dark:bg-slate-800/60">
          <button
            type="button"
            aria-label="Shriftni kichiklashtirish"
            onClick={() => setFontSize((s) => Math.max(12, s - 1))}
            className="px-1.5 font-semibold text-neutral-600 hover:text-neutral-900 dark:text-slate-400"
          >
            A-
          </button>
          <span className="px-1 tabular-nums text-neutral-400">{fontSize}px</span>
          <button
            type="button"
            aria-label="Shriftni kattalashtirish"
            onClick={() => setFontSize((s) => Math.min(24, s + 1))}
            className="px-1.5 font-semibold text-neutral-600 hover:text-neutral-900 dark:text-slate-400"
          >
            A+
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
      <span className="text-blue-500">{icon}</span>
      {children}
    </span>
  );
}

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors",
        active ? "text-orange-600" : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      )}
    >
      {label}
      {typeof count === "number" && (
        <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-semibold dark:bg-neutral-800">
          {count}
        </span>
      )}
      {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-orange-500" />}
    </button>
  );
}

function Samples({ exam }: { exam: ContestProblemData["exam"] }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard ruxsati yo'q */
    }
  };

  return (
    <section className="mt-6">
      <h3 className="mb-3 text-lg font-semibold text-blue-600">Misollar</h3>
      <div className="space-y-3">
        {exam.map((t, i) => (
          <div key={t.id} className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-neutral-800">
              {(
                [
                  ["input.txt", t.input, `i${t.id}`],
                  ["output.txt", t.output, `o${t.id}`],
                ] as const
              ).map(([label, value, key]) => (
                <div key={key} className="min-w-0 p-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-500">
                    <span>
                      #{i + 1} {label}
                    </span>
                    <button
                      type="button"
                      aria-label="Nusxa olish"
                      onClick={() => copy(value, key)}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      {copied === key ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>
                  <pre className="overflow-x-auto font-mono text-sm">{value}</pre>
                </div>
              ))}
            </div>
            {t.explanation && (
              <p className="border-t border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800">
                <b className="text-neutral-700 dark:text-neutral-300">Izoh:</b> {t.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
