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

interface DayInfo {
  date: string;
  value: number; // faollik balli (yechilgan masalalar)
  xp: number;
  solved: number;
  minutes: number;
}

interface Summary {
  total_xp: number;
  total_solved: number;
  total_minutes: number;
  best_xp: number;
  active_days: number;
  tracked_days: number;
  rate: number;
  current_streak: number;
  longest_streak: number;
}

interface HeatmapResponse {
  first_year: number;
  range: { from: string | null; to: string | null };
  summary: Summary;
  days: DayInfo[];
}

interface HeatmapProps {
  telegramId?: string | number;
  username?: string;
  registrationYear?: number;
}

const MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"];
const MONTHS_FULL = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];
// Yakshanbadan boshlanadi (JS getDay() tartibi)
const WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
const WEEKDAYS_FULL = [
  "yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba",
];

const nf = new Intl.NumberFormat("en-US").format;

const fetcher = async (url: string): Promise<HeatmapResponse> => {
  const res = await backendRequest(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Heatmap ma'lumotlarini yuklab bo'lmadi.");
  }
  return res.json();
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAYS_FULL[new Date(y, m - 1, d).getDay()];
  return `${d}-${MONTHS_FULL[m - 1]}, ${y} · ${weekday}`;
}

function formatMinutes(min: number) {
  if (min < 60) return `${min} daqiqa`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

/** Kvartillar: bitta juda katta qiymat qolgan kunlarni oqartirib yubormaydi. */
function buildThresholds(values: number[]): [number, number, number] {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (!sorted.length) return [0, 0, 0];
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

function levelOf(v: number, [t1, t2, t3]: [number, number, number]) {
  if (v <= 0) return 0;
  if (v <= t1) return 1;
  if (v <= t2) return 2;
  if (v <= t3) return 3;
  return 4;
}

export default function Heatmap({ telegramId, username, registrationYear }: HeatmapProps) {
  const currentYear = new Date().getFullYear();
  const identifier = telegramId ?? username;
  const [year, setYear] = useState(currentYear);

  const { data, error, isLoading, isValidating } = useSWR<HeatmapResponse>(
    identifier
      ? `/api/user/heatmap/${encodeURIComponent(String(identifier))}?year=${year}`
      : null,
    fetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60_000,
    },
  );

  const firstYear = Math.min(currentYear, data?.first_year ?? registrationYear ?? currentYear);
  const years = useMemo(
    () => Array.from({ length: currentYear - firstYear + 1 }, (_, i) => currentYear - i),
    [currentYear, firstYear],
  );

  // Tooltip uchun O(1) qidiruv
  const byDate = useMemo(
    () => new Map((data?.days ?? []).map((d) => [d.date, d])),
    [data],
  );

  // Kutubxonaga: faqat daraja (0–4). Bo'sh kunlarni kutubxona o'zi 0 bilan to'ldiradi,
  // lekin range chegaralari (from/to) bo'lishi shart — shunda Noy/Dek chizilmaydi.
  const heatmapData = useMemo(() => {
    const from = data?.range.from;
    const to = data?.range.to;
    if (!from || !to) return [];

    const th = buildThresholds((data?.days ?? []).map((d) => d.value));
    const items = (data?.days ?? []).map((d) => ({ date: d.date, value: levelOf(d.value, th) }));

    if (!byDate.has(from)) items.push({ date: from, value: 0 });
    if (!byDate.has(to)) items.push({ date: to, value: 0 });

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [data, byDate]);

  // Grafik ochilganda oxirgi (bugungi) haftaga scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [heatmapData]);

  if (!identifier) {
    return (
      <div className="rounded-xl border p-5 text-sm text-muted-foreground">
        Username yoki telegramId berilishi kerak.
      </div>
    );
  }

  const s = data?.summary;

  return (
    <section className="w-full min-w-0 space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Faollik xaritasi</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">
            {year} yildagi kundalik faollik va yechilgan masalalar
          </p>
        </div>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Yilni tanlash"
          className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-amber-500 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </header>

      {error && !data ? (
        <div role="alert" className="rounded-lg border p-4 text-sm text-destructive">
          {error.message}
        </div>
      ) : isLoading || !data || !s ? (
        <div className="h-44 animate-pulse rounded-lg bg-muted" />
      ) : (
        <div className={isValidating ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Jami XP"
              value={nf(s.total_xp)}
              hint={s.best_xp ? `Eng yaxshi kun: ${nf(s.best_xp)} XP` : undefined}
            />
            <Stat
              label="Yechilgan masalalar"
              value={nf(s.total_solved)}
              hint={s.total_minutes ? formatMinutes(s.total_minutes) : undefined}
            />
            <Stat
              label="Faol kunlar"
              value={nf(s.active_days)}
              hint={`${nf(s.tracked_days)} kunning ${s.rate}%`}
            />
            <Stat
              label={year === currentYear ? "Joriy seriya" : "Eng uzun seriya"}
              value={`${year === currentYear ? s.current_streak : s.longest_streak} kun`}
              hint={year === currentYear ? `Eng uzun: ${s.longest_streak} kun` : undefined}
            />
          </div>

          <div ref={scrollRef} className="mt-5 w-full min-w-0 overflow-x-auto pb-3">
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
                  colors={{ empty: "var(--color-heat-0)", scale: "var(--color-heat-3)" }}
                  labels={{
                    months: MONTHS_SHORT,
                    weekdays: WEEKDAYS_SHORT,
                    cellLabel: "{{date}}",
                  }}
                >
                  <CalendarHeatmapBody hideYearLabels labelClassName="text-muted-foreground">
                    {({ activity, dayIndex, weekIndex }) => {
                      const info = byDate.get(activity.date);

                      return (
                        <Tooltip key={activity.date}>
                          <TooltipTrigger asChild>
                            <CalendarHeatmapBlock
                              activity={activity}
                              dayIndex={dayIndex}
                              weekIndex={weekIndex}
                            />
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            sideOffset={6}
                            className="pointer-events-none space-y-0.5 text-xs"
                          >
                            <p className="font-medium">{formatDate(activity.date)}</p>
                            {info ? (
                              <>
                                <p>{nf(info.solved)} ta masala · {nf(info.xp)} XP</p>
                                {info.minutes > 0 && <p>{formatMinutes(info.minutes)}</p>}
                              </>
                            ) : (
                              <p className="opacity-70">Faollik yo'q</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }}
                  </CalendarHeatmapBody>

                  <CalendarHeatmapFooter>
                    <CalendarHeatmapStat>
                      {() => `${year} yilda ${nf(s.active_days)} faol kun · ${nf(s.total_xp)} XP`}
                    </CalendarHeatmapStat>
                    <CalendarHeatmapLegend labels={{ less: "Kamroq", more: "Ko'proq" }} />
                  </CalendarHeatmapFooter>
                </CalendarHeatmap>
              </TooltipProvider>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
