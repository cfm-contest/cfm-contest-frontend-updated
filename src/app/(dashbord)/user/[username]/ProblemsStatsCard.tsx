"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/utils";
import type { ProblemStats } from "@/lib/problems/types";

const RADIUS = 52;
const STROKE = 11;
const GAP_DEG = 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2;

const DIFFICULTY_META = [
  { key: "easy" as const, label: "Oson", color: "#3DB87A" },
  { key: "medium" as const, label: "O'rta", color: "#D9AE55" },
  { key: "hard" as const, label: "Qiyin", color: "#D0645A" },
];

function buildSegments(stats: ProblemStats) {
  const gapLen = (GAP_DEG / 360) * CIRCUMFERENCE;
  const usable = CIRCUMFERENCE - gapLen * DIFFICULTY_META.length;
  let offset = 0;

  return DIFFICULTY_META.map((meta) => {
    const d = stats.by_difficulty[meta.key];
    const trackLen = stats.total > 0 ? (d.total / stats.total) * usable : 0;
    const fillLen = d.total > 0 ? (d.solved / d.total) * trackLen : 0;
    const seg = { ...meta, ...d, trackLen, fillLen, offset };
    offset += trackLen + gapLen;
    return seg;
  });
}

function StatsRingSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-zinc-900 shadow-sm">
      <div className="mb-4 h-4 w-28 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <div className="size-[126px] shrink-0 rounded-full bg-slate-100 dark:bg-zinc-800 animate-pulse" />
        <div className="w-full flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-full rounded bg-slate-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsRingError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <p className="text-sm text-slate-500 dark:text-zinc-400">Statistikani yuklab bo'lmadi.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
      >
        Qayta urinish
      </button>
    </div>
  );
}

export function ProblemsStatsCard() {
  const { data, error, isLoading, mutate } = useSWR<ProblemStats>("/api/problems/stats", fetcher, {
    dedupingInterval: 5 * 60_000,
    revalidateOnFocus: false,
  });

  if (isLoading && !data) return <StatsRingSkeleton />;
  if (error && !data) return <StatsRingError onRetry={() => mutate()} />;
  if (!data) return null;

  const segments = buildSegments(data);
  const c = RADIUS + STROKE;
  const summary = segments
    .map((seg) => `${seg.label.toLowerCase()}: ${seg.solved}/${seg.total}`)
    .join(", ");

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Mening holatim</h3>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <div
          className="relative shrink-0"
          style={{ width: SIZE, height: SIZE }}
          role="img"
          aria-label={`Jami ${data.solved}/${data.total} masala yechilgan (${summary})`}
        >
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
            <circle cx={c} cy={c} r={RADIUS} fill="none" stroke="#F1EFE7" strokeWidth={STROKE} />
            {segments.map((seg) => (
              <g key={seg.key}>
                <circle
                  cx={c}
                  cy={c}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeOpacity={0.16}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${seg.trackLen} ${CIRCUMFERENCE - seg.trackLen}`}
                  strokeDashoffset={-seg.offset}
                />
                <circle
                  cx={c}
                  cy={c}
                  r={RADIUS}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${seg.fillLen} ${CIRCUMFERENCE - seg.fillLen}`}
                  strokeDashoffset={-seg.offset}
                />
              </g>
            ))}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black leading-none text-slate-950 dark:text-white">{data.solved}</span>
            <span className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">/ {data.total} yechilgan</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-3">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-zinc-400">
                <span className="size-2 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {seg.solved}/{seg.total}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}