
"use client";

import { backendRequest } from "@/lib/api/django/backend";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import {
  CalendarHeatmap,
  CalendarHeatmapBlock,
  CalendarHeatmapBody,
  CalendarHeatmapFooter,
  CalendarHeatmapLegend,
  CalendarHeatmapStat,
} from "@/components/heatmap/calendar-heatmap";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface DayInfo {
  date: string;
  q: number;
  p: number;
  l: number;
}

interface HeatmapResponse {
  first_year: number;

  range: {
    from: string;
    to: string;
  };

  current_streak: number;

  days: DayInfo[];
}

interface HeatmapProps {
  telegramId?: string | number;
  username?: string;
  registrationYear?: number;
}

interface HeatmapItem {
  date: string;
  value: number;
}

// --------------------------------------------------
// CONSTANTS
// --------------------------------------------------

const MONTHS_SHORT = [
  "Yan", "Fev", "Mar", "Apr", "May", "Iyun",
  "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek",
];

const MONTHS_FULL = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

const WEEKDAYS_SHORT = [
  "Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan",
];

const WEEKDAYS_FULL = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
];

const nf = new Intl.NumberFormat("en-US").format;

// --------------------------------------------------
// HEATMAP COLORS
// --------------------------------------------------

const HEATMAP_EMPTY = "var(--color-heat-0)";
const HEATMAP_GREEN = "var(--color-heat-3)";

/**
 * Ballga qarab rang qaytaradi.
 *
 * 0       = bo'sh
 * 1       = 20% yashil
 * 2-4     = 47% yashil
 * 5-9     = 73% yashil
 * 10+     = 100% yashil
 *
 * Muhim:
 * Ranglar foydalanuvchining maksimal natijasiga bog'liq emas.
 */
function getActivityColor(score: number): string {
  if (score >= 10) {
    return `color-mix(in oklch, ${HEATMAP_GREEN} 100%, transparent)`;
  }

  if (score >= 5) {
    return `color-mix(in oklch, ${HEATMAP_GREEN} 73%, transparent)`;
  }

  if (score >= 2) {
    return `color-mix(in oklch, ${HEATMAP_GREEN} 47%, transparent)`;
  }

  if (score >= 1) {
    return `color-mix(in oklch, ${HEATMAP_GREEN} 20%, transparent)`;
  }

  return HEATMAP_EMPTY;
}

// --------------------------------------------------
// FETCHER
// --------------------------------------------------

const fetcher = async (url: string): Promise<HeatmapResponse> => {
  const res = await backendRequest(url);

  if (!res.ok) {
    const body = await res.json().catch(() => null);

    throw new Error(
      body?.detail ?? "Heatmap ma'lumotlarini yuklab bo'lmadi."
    );
  }

  return res.json();
};

// --------------------------------------------------
// DATE HELPERS
// --------------------------------------------------

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  const weekday = WEEKDAYS_FULL[date.getDay()];

  return `${day}-${MONTHS_FULL[month - 1]}, ${year} · ${weekday}`;
}

/**
 * Vaqt zonasi sababli kunlar noto'g'ri hisoblanmasligi uchun
 * UTC orqali kun raqamini olamiz.
 */
function getDateOrdinal(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);

  return Math.floor(
    Date.UTC(year, month - 1, day) / 86_400_000
  );
}

function getDaysBetween(from: string, to: string) {
  return Math.max(
    getDateOrdinal(to) - getDateOrdinal(from) + 1,
    0
  );
}

// --------------------------------------------------
// ACTIVITY SCORE
// --------------------------------------------------

/**
 * 3 ta question = 1 ball
 * 1 ta problem = 1 ball
 * 1 ta locore = 1 ball
 */
function getActivityScore(day: DayInfo) {
  return Math.floor(day.q / 3) + day.p + day.l;
}

// --------------------------------------------------
// SUMMARY CALCULATOR
// --------------------------------------------------

function calculateStats(
  days: DayInfo[],
  currentStreak: number,
  isCurrentYear: boolean,
  range: HeatmapResponse["range"]
) {
  let totalScore = 0;

  let totalQuestions = 0;
  let totalProblems = 0;
  let totalLocore = 0;

  let bestDayScore = 0;
  let bestDayDate: string | null = null;

  const sortedDays = [...days].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let longestStreak = 0;
  let currentRun = 0;
  let previousOrdinal: number | null = null;

  for (const day of sortedDays) {
    const score = getActivityScore(day);

    totalScore += score;

    totalQuestions += day.q;
    totalProblems += day.p;
    totalLocore += day.l;

    if (score > bestDayScore) {
      bestDayScore = score;
      bestDayDate = day.date;
    }

    // Longest streak
    const currentOrdinal = getDateOrdinal(day.date);

    if (
      previousOrdinal === null ||
      currentOrdinal - previousOrdinal !== 1
    ) {
      currentRun = 1;
    } else {
      currentRun++;
    }

    longestStreak = Math.max(longestStreak, currentRun);

    previousOrdinal = currentOrdinal;
  }

  // Joriy yil uchun backenddagi haqiqiy streakni ham hisobga olamiz.
  if (isCurrentYear) {
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  const activeDays = days.length;

  const trackedDays = getDaysBetween(
    range.from,
    range.to
  );

  const activityRate = trackedDays
    ? Number(((activeDays / trackedDays) * 100).toFixed(1))
    : 0;

  return {
    totalScore,

    totalQuestions,
    totalProblems,
    totalLocore,

    totalActivities:
      totalQuestions + totalProblems + totalLocore,

    bestDayScore,
    bestDayDate,

    activeDays,
    trackedDays,
    activityRate,

    currentStreak,
    longestStreak,
  };
}

// --------------------------------------------------
// MAIN COMPONENT
// --------------------------------------------------

export default function Heatmap({
  telegramId,
  username,
  registrationYear,
}: HeatmapProps) {
  const currentYear = new Date().getFullYear();

  const identifier = telegramId ?? username;

  const [year, setYear] = useState(currentYear);

  const scrollRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // SWR
  // --------------------------------------------------

  const {
    data,
    error,
    isLoading,
    isValidating,
  } = useSWR<HeatmapResponse>(
    identifier
      ? `/api/user/heatmap/${encodeURIComponent(
          String(identifier)
        )}?year=${year}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    }
  );

  // --------------------------------------------------
  // AVAILABLE YEARS
  // --------------------------------------------------

  const firstYear = Math.min(
    currentYear,
    data?.first_year ?? registrationYear ?? currentYear
  );

  const years = useMemo(
    () =>
      Array.from(
        { length: currentYear - firstYear + 1 },
        (_, i) => currentYear - i
      ),
    [currentYear, firstYear]
  );

  // --------------------------------------------------
  // DATE MAP
  // --------------------------------------------------

  const byDate = useMemo(
    () =>
      new Map(
        (data?.days ?? []).map((day) => [
          day.date,
          day,
        ])
      ),
    [data?.days]
  );

  // --------------------------------------------------
  // HEATMAP DATA
  // --------------------------------------------------

  const heatmapData = useMemo<HeatmapItem[]>(() => {
    if (!data?.range?.from || !data?.range?.to) {
      return [];
    }

    const items: HeatmapItem[] = data.days.map((day) => ({
      date: day.date,
      value: getActivityScore(day),
    }));

    // Boshlanish va tugash sanalarini majburiy qo'shamiz.
    if (!byDate.has(data.range.from)) {
      items.push({
        date: data.range.from,
        value: 0,
      });
    }

    if (!byDate.has(data.range.to)) {
      items.push({
        date: data.range.to,
        value: 0,
      });
    }

    return items.sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [data, byDate]);

  // --------------------------------------------------
  // STATISTICS
  // --------------------------------------------------

  const stats = useMemo(() => {
    if (!data) return null;

    return calculateStats(
      data.days,
      data.current_streak,
      year === currentYear,
      data.range
    );
  }, [data, year, currentYear]);

  // --------------------------------------------------
  // SCROLL TO LATEST WEEK
  // --------------------------------------------------

  useEffect(() => {
    const el = scrollRef.current;

    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, [heatmapData]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  if (!identifier) {
    return (
      <div className="rounded-xl border p-5 text-sm text-muted-foreground">
        Username yoki telegramId berilishi kerak.
      </div>
    );
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (isLoading && !data) {
    return (
      <section className="space-y-5 rounded-3xl border p-5 sm:p-6">
        <div className="h-7 w-48 animate-pulse rounded bg-muted" />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>

        <div className="h-44 animate-pulse rounded-xl bg-muted" />
      </section>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error && !data) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-destructive/30 p-5 text-sm text-destructive"
      >
        {error.message}
      </div>
    );
  }

  if (!data || !stats) {
    return null;
  }

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section className="w-full min-w-0 space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-6">

      {/* HEADER */}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Faollik xaritasi
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {year} yildagi kundalik faollik
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isValidating && (
            <span className="text-xs text-muted-foreground">
              Yuklanmoqda...
            </span>
          )}

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Yilni tanlash"
            className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-500 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* STATS */}

      <div
        className={`grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4 ${
          isValidating ? "opacity-60" : "opacity-100"
        }`}
      >
        <Stat
          label="Faollik balli"
          value={nf(stats.totalScore)}
          hint={
            stats.bestDayScore > 0
              ? `Eng yaxshi kun: ${nf(stats.bestDayScore)} ball`
              : "Hozircha ball yo'q"
          }
        />

        <Stat
          label="Jami amallar"
          value={nf(stats.totalActivities)}
          hint={`Q: ${nf(stats.totalQuestions)} · P: ${nf(stats.totalProblems)} · L: ${nf(stats.totalLocore)}`}
        />

        <Stat
          label="Faol kunlar"
          value={nf(stats.activeDays)}
          hint={`${nf(stats.activityRate)}% kalendar davridan`}
        />

        <Stat
          label={
            year === currentYear
              ? "Joriy seriya"
              : "Eng uzun seriya"
          }
          value={`${
            year === currentYear
              ? stats.currentStreak
              : stats.longestStreak
          } kun`}
          hint={
            year === currentYear
              ? `Eng uzun: ${stats.longestStreak} kun`
              : "Tanlangan yildagi natija"
          }
        />
      </div>

      {/* HEATMAP */}

      <div
        ref={scrollRef}
        className="w-full min-w-0 overflow-x-auto pb-3"
      >
        <div className="w-max min-w-full">
          <TooltipProvider delayDuration={0}>
            <CalendarHeatmap
              data={heatmapData}
              weekStart={1}
              blockSize={13}
              blockMargin={3}
              blockRadius={3}
              fontSize={12}
              levels={5}
              colors={{
                empty: HEATMAP_EMPTY,
                scale: HEATMAP_GREEN,
              }}
              labels={{
                months: MONTHS_SHORT,
                weekdays: WEEKDAYS_SHORT,
                cellLabel: "{{date}}",
              }}
            >
              <CalendarHeatmapBody
                hideYearLabels
                labelClassName="text-muted-foreground"
              >
                {({ activity, dayIndex, weekIndex }) => {
                  const info = byDate.get(activity.date);

                  // Haqiqiy ball
                  const score = info
                    ? getActivityScore(info)
                    : 0;

                  return (
                    <Tooltip key={activity.date}>
                      <TooltipTrigger asChild>
                        <CalendarHeatmapBlock
                          activity={activity}
                          dayIndex={dayIndex}
                          weekIndex={weekIndex}
                          style={{
                            // Asosiy tuzatish:
                            // Rangni avtomatik darajadan emas,
                            // haqiqiy balldan hisoblaymiz.
                            fill: getActivityColor(score),
                          }}
                        />
                      </TooltipTrigger>

                      <TooltipContent
                        side="top"
                        sideOffset={6}
                        className="pointer-events-none space-y-1 text-xs"
                      >
                        <p className="font-semibold">
                          {formatDate(activity.date)}
                        </p>

                        {info ? (
                          <>
                            <div className="my-1 border-t border-border" />

                            <p>
                              Question:{" "}
                              <span className="font-semibold">
                                {nf(info.q)}
                              </span>
                            </p>

                            <p>
                              Problem:{" "}
                              <span className="font-semibold">
                                {nf(info.p)}
                              </span>
                            </p>

                            <p>
                              Locore:{" "}
                              <span className="font-semibold">
                                {nf(info.l)}
                              </span>
                            </p>

                            <div className="my-1 border-t border-border" />

                            <p className="font-semibold">
                              Faollik balli: {nf(score)}
                            </p>
                          </>
                        ) : (
                          <p className="opacity-70">
                            Faollik yo'q
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }}
              </CalendarHeatmapBody>

              {/* FOOTER */}

              <CalendarHeatmapFooter>
                <CalendarHeatmapStat>
                  {() =>
                    `${year} yilda ${nf(stats.activeDays)} faol kun · ${nf(stats.totalScore)} ball`
                  }
                </CalendarHeatmapStat>

                <CalendarHeatmapLegend
                  labels={{
                    less: "Kamroq",
                    more: "Ko'proq",
                  }}
                />
              </CalendarHeatmapFooter>
            </CalendarHeatmap>
          </TooltipProvider>
        </div>
      </div>

      {/* ERROR WHILE REVALIDATING */}

      {error && data && (
        <p className="text-xs text-destructive">
          Ma'lumotlarni yangilashda xatolik: {error.message}
        </p>
      )}

    </section>
  );
}

// --------------------------------------------------
// STAT CARD
// --------------------------------------------------

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200/60 bg-slate-50/70 p-3.5 dark:border-white/5 dark:bg-zinc-800/50 sm:p-4">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </p>

      <p className="mt-1.5 truncate text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white sm:text-2xl">
        {value}
      </p>

      {hint && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
          {hint}
        </p>
      )}
    </div>
  );
}
