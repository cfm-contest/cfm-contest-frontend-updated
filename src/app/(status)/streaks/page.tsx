"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Coins, Flame,
  Gift, Lock, Share2, Snowflake, Target, TrendingUp, Trophy, Zap,
} from "lucide-react";
import { StreakBadge } from "@/components/ui/streak-badge";
import { StreakCalendar } from "@/components/ui/streak-calendar";
import { StreakCard } from "@/components/ui/streak-card";
import { AchievementGrid } from "@/components/ui/achievement-grid";

/* ================================================================== */
/* Turlar                                                              */
/* ================================================================== */

interface StreakPeriod {
  periodStart: string;
  periodEnd: string;
  usedFreeze?: boolean;
}

type ScenarioId = "new" | "active" | "veteran";

/** Backend javobi shakli. Haqiqiy API shu ko'rinishda qaytarsa, UI o'zgarmaydi. */
interface StreakResponse {
  periods: StreakPeriod[];
  freezes: number;
  coins: number;
  claimed: number[]; // olingan bosqichlar (kunlar)
}

/* ================================================================== */
/* Konfiguratsiya                                                      */
/* ================================================================== */

const MILESTONES = [
  { days: 3, title: "Ilk qadam", reward: 20 },
  { days: 7, title: "Bir haftalik", reward: 50 },
  { days: 14, title: "Ikki haftalik", reward: 100 },
  { days: 30, title: "Bir oylik", reward: 250 },
  { days: 100, title: "Yuztalik", reward: 1000 },
  { days: 365, title: "Afsonaviy", reward: 5000 },
] as const;

const FREEZE_PRICE = 50;
const FREEZE_MAX = 3;
const MOCK_TODAY = new Date(2026, 9, 10); // backend ulanganda: new Date()

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS_SHORT = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];
const WEEKDAYS_FULL = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba", "Yakshanba"];

/* ================================================================== */
/* Sana yordamchilari                                                  */
/* ================================================================== */

const pad = (n: number) => String(n).padStart(2, "0");
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const range = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = parseKey(from); d <= parseKey(to); d = addDays(d, 1)) out.push(toKey(d));
  return out;
};
const active = (keys: string[]): StreakPeriod[] => keys.map(k => ({ periodStart: k, periodEnd: k }));
const frozen = (keys: string[]): StreakPeriod[] =>
  keys.map(k => ({ periodStart: k, periodEnd: k, usedFreeze: true }));
const formatDate = (d: Date) => `${d.getDate()}-${MONTHS[d.getMonth()].toLowerCase()}, ${d.getFullYear()}`;

/* ================================================================== */
/* Mock API — keyin faqat shu funksiyani fetch bilan almashtiring       */
/* ================================================================== */

const SCENARIOS: Record<ScenarioId, { label: string; data: StreakResponse }> = {
  new: {
    label: "Yangi",
    data: { periods: active(["2026-09-29", "2026-09-30", "2026-10-04"]), freezes: 0, coins: 74, claimed: [] },
  },
  active: {
    label: "Faol · 5",
    data: { periods: active(range("2026-10-06", "2026-10-10")), freezes: 0, coins: 279, claimed: [] },
  },
  veteran: {
    label: "Ilg'or · 15",
    data: {
      periods: [
        ...active([
          ...range("2026-08-03", "2026-08-09"),
          ...range("2026-08-18", "2026-08-24"),
          ...range("2026-09-02", "2026-09-08"),
          ...range("2026-09-25", "2026-09-29"),
          ...range("2026-10-01", "2026-10-09"),
        ]),
        ...frozen(["2026-09-30"]),
      ],
      freezes: 1,
      coins: 420,
      claimed: [3, 7],
    },
  },
};

async function fetchStreakData(id: ScenarioId): Promise<StreakResponse> {
  await new Promise(r => setTimeout(r, 650));
  return structuredClone(SCENARIOS[id].data);
}

/* ================================================================== */
/* Hisob-kitoblar (hammasi bitta `periods` ro'yxatidan)                 */
/* ================================================================== */

function computeStats(periods: StreakPeriod[], today: Date) {
  const activeSet = new Set(periods.filter(p => !p.usedFreeze).map(p => p.periodStart));
  const frozenSet = new Set(periods.filter(p => p.usedFreeze).map(p => p.periodStart));
  const activeToday = activeSet.has(toKey(today));

  // Joriy streak: muzlatilgan kun streakni uzmaydi, lekin qo'shilmaydi
  let current = 0;
  for (
    let d = activeToday ? today : addDays(today, -1);
    activeSet.has(toKey(d)) || frozenSet.has(toKey(d));
    d = addDays(d, -1)
  ) {
    if (activeSet.has(toKey(d))) current++;
  }

  // Eng uzun streak
  const all = [...activeSet, ...frozenSet].sort();
  let longest = 0;
  let run = 0;
  if (all.length) {
    for (let d = parseKey(all[0]); d <= today; d = addDays(d, 1)) {
      const k = toKey(d);
      if (activeSet.has(k)) {
        run++;
        longest = Math.max(longest, run);
      } else if (!frozenSet.has(k)) {
        run = 0;
      }
    }
  }

  const activeDates = [...activeSet].sort();
  const lastActive = activeDates.length ? parseKey(activeDates[activeDates.length - 1]) : null;

  // Tahlil
  const weekday = Array<number>(7).fill(0); // Dushanbadan boshlab
  activeDates.forEach(k => weekday[(parseKey(k).getDay() + 6) % 7]++);
  const from30 = addDays(today, -29);
  const last30 = activeDates.filter(k => parseKey(k) >= from30 && parseKey(k) <= today).length;
  const thisMonth = activeDates.filter(k => {
    const d = parseKey(k);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const maxWeekday = Math.max(...weekday);

  return {
    current, longest, activeToday, lastActive, frozenSet, activeSet,
    total: activeSet.size,
    weekday, maxWeekday,
    bestWeekday: maxWeekday > 0 ? weekday.indexOf(maxWeekday) : null,
    last30,
    rate30: Math.round((last30 / 30) * 100),
    thisMonth,
    frozenDates: [...frozenSet].sort().reverse(),
  };
}

/* ================================================================== */
/* Kichik UI bo'laklari                                                */
/* ================================================================== */

const cardCls =
  "rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${cardCls} p-5 sm:p-6 ${className}`}>{children}</section>;
}

function CardHeader({
  icon, title, subtitle, right,
}: { icon: ReactNode; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function StatTile({
  icon, label, value, hint, tone,
}: { icon: ReactNode; label: string; value: ReactNode; hint: string; tone: "blue" | "violet" | "emerald" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };
  return (
    <div className={`${cardCls} p-4 transition motion-safe:hover:-translate-y-0.5 hover:shadow-md sm:p-5`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-400">{hint}</p>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800 ${className}`} />;
}

function LoadingState() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-44 rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Skeleton className="h-96 rounded-3xl" />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}

/* ================================================================== */
/* Sahifa                                                              */
/* ================================================================== */

export default function StreaksPage() {
  const [scenario, setScenario] = useState<ScenarioId>("active");
  const [data, setData] = useState<StreakResponse | null>(null);
  const [freezes, setFreezes] = useState(0);
  const [coins, setCoins] = useState(0);
  const [claimed, setClaimed] = useState<number[]>([]);

  const [calView, setCalView] = useState<"month" | "year">("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [pickedDay, setPickedDay] = useState<{ date: Date; wasActive: boolean } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Ma'lumot yuklash (mock API)
  useEffect(() => {
    let off = false;
    setData(null);
    fetchStreakData(scenario).then(res => {
      if (off) return;
      setData(res);
      setFreezes(res.freezes);
      setCoins(res.coins);
      setClaimed(res.claimed);
      setPickedDay(null);
      setMonthOffset(0);
      setHighlight(null);
    });
    return () => { off = true; };
  }, [scenario]);

  // Kun tugashigacha qolgan vaqt
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setTimeLeft(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Toast avtomatik yopiladi
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => computeStats(data?.periods ?? [], MOCK_TODAY), [data]);

  const next = MILESTONES.find(m => m.days > stats.current) ?? null;
  const progress = next ? Math.min(100, (stats.current / next.days) * 100) : 100;

  const achievements = useMemo(
    () =>
      MILESTONES.map(m => ({
        id: String(m.days),
        name: m.title,
        trigger: "streak" as const,
        achievedAt: stats.longest >= m.days ? MOCK_TODAY.toISOString() : null,
      })),
    [stats.longest],
  );
  const unlockedCount = achievements.filter(a => a.achievedAt).length;
  const claimableCount = MILESTONES.filter(m => stats.longest >= m.days && !claimed.includes(m.days)).length;

  /* ---------------- Amallar ---------------- */

  function buyFreeze() {
    if (freezes >= FREEZE_MAX) return setToast({ type: "error", text: `Ko'pi bilan ${FREEZE_MAX} ta muzlatgich saqlash mumkin.` });
    if (coins < FREEZE_PRICE) return setToast({ type: "error", text: "Tangalar yetarli emas." });
    setFreezes(f => f + 1);
    setCoins(c => c - FREEZE_PRICE);
    setToast({ type: "ok", text: "Muzlatgich qo'shildi ❄️" });
  }

  function claim(days: number, reward: number) {
    if (claimed.includes(days)) return;
    setClaimed(c => [...c, days]);
    setCoins(c => c + reward);
    setToast({ type: "ok", text: `+${reward} tanga olindi 🎉` });
  }

  async function share() {
    const text = `🔥 Men Robocontest'da ${stats.current} kunlik streakdaman! robocontest.uz/streaks`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setToast({ type: "ok", text: "Havola nusxalandi" });
      }
    } catch {
      /* foydalanuvchi bekor qildi */
    }
  }

  /* ---------------- Hosila qiymatlar ---------------- */

  const shownMonth = new Date(MOCK_TODAY.getFullYear(), MOCK_TODAY.getMonth() + monthOffset, 1);

  const pickedStatus = (() => {
    if (!pickedDay) return null;
    const k = toKey(pickedDay.date);
    if (pickedDay.date > MOCK_TODAY) return { label: "Hali kelmagan kun", tone: "slate" as const };
    if (stats.frozenSet.has(k)) return { label: "Muzlatgich ishlatilgan", tone: "sky" as const };
    if (pickedDay.wasActive || stats.activeSet.has(k)) return { label: "Faol kun", tone: "orange" as const };
    return { label: "O'tkazib yuborilgan", tone: "slate" as const };
  })();

  const atRisk = !stats.activeToday && stats.current > 0;

  const heroMessage = stats.activeToday
    ? "Ajoyib! Bugungi maqsad bajarildi."
    : stats.current > 0
      ? "Streakni saqlash uchun bugun kamida 1 ta masala yeching."
      : "Bugun yangi streak boshlang!";

  /* ================================================================== */
  /* Render                                                              */
  /* ================================================================== */

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Yuqori panel */}
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Streaklar</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Har kungi faolligingizni kuzating</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Demo — productionda olib tashlang */}
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900">
              {(Object.keys(SCENARIOS) as ScenarioId[]).map(id => (
                <button
                  key={id}
                  onClick={() => setScenario(id)}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                    scenario === id
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {SCENARIOS[id].label}
                </button>
              ))}
            </div>
            <button
              onClick={share}
              disabled={!data}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Share2 size={14} /> Ulashish
            </button>
          </div>
        </header>

        {!data ? (
          <LoadingState />
        ) : (
          <div className="space-y-5">
            {/* ---------------- Hero ---------------- */}
            <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400 p-6 text-white shadow-lg shadow-orange-500/20 sm:p-8">
              <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-yellow-200/30 blur-3xl" />
              <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                    <Zap size={13} fill="currentColor" />
                    {stats.current > 0 && stats.current === stats.longest ? "Shaxsiy rekord" : "Har kuni davom eting"}
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                    {heroMessage}
                  </h2>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-white/90">
                    {stats.lastActive && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5">
                        <CalendarDays size={13} /> Oxirgi faollik: {formatDate(stats.lastActive)}
                      </span>
                    )}
                    {next && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1.5">
                        <Target size={13} /> Keyingi: {next.days} kun · +{next.reward} tanga
                      </span>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {stats.activeToday ? (
                      <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-600 shadow-sm">
                        <Check size={16} /> Bugun streak saqlandi
                      </span>
                    ) : (
                      <a
                        href="/problems"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-orange-600 shadow-sm transition hover:bg-orange-50 motion-safe:hover:-translate-y-0.5"
                      >
                        Masala yechish <ChevronRight size={16} />
                      </a>
                    )}
                    {!stats.activeToday && timeLeft && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-white/90">
                        <Clock size={14} /> Kun tugashiga {timeLeft}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mx-auto flex w-full max-w-[220px] flex-col items-center rounded-3xl border border-white/30 bg-white/15 p-6 text-center backdrop-blur-sm">
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-white/30 blur-xl motion-safe:animate-pulse" />
                    <Flame size={44} className="relative text-white drop-shadow" fill="currentColor" />
                  </div>
                  <p className="mt-2 text-6xl font-black leading-none tabular-nums">{stats.current}</p>
                  <p className="mt-1 text-sm font-medium text-white/90">kunlik streak</p>
                  <div className="mt-4 rounded-xl bg-white px-2 py-1 text-orange-600">
                    <StreakBadge length={stats.current} frequency="daily" size="sm" />
                  </div>
                </div>
              </div>
            </section>

            {/* ---------------- Xavf ogohlantirishi ---------------- */}
            {atRisk && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p>
                  <b>{stats.current} kunlik streakingiz xavf ostida.</b>{" "}
                  {freezes > 0
                    ? `Bugun faol bo'lmasangiz, ${freezes} ta muzlatgichdan biri ishlatiladi.`
                    : "Sizda muzlatgich yo'q — bugun masala yechmasangiz streak 0 ga tushadi."}
                </p>
              </div>
            )}

            {/* ---------------- Statistika kartochkalari ---------------- */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile tone="blue" icon={<Trophy size={18} />} label="Eng uzun streak" value={<>{stats.longest} <span className="text-sm font-semibold text-slate-400">kun</span></>} hint="Hozirgacha eng yaxshi natija" />
              <StatTile tone="violet" icon={<CalendarDays size={18} />} label="Jami faol kun" value={<>{stats.total} <span className="text-sm font-semibold text-slate-400">kun</span></>} hint="Barcha vaqt davomida" />
              <StatTile tone="emerald" icon={<TrendingUp size={18} />} label="Oxirgi 30 kun" value={`${stats.rate30}%`} hint={`${stats.last30} / 30 kun faol`} />
              <StatTile tone="amber" icon={<Flame size={18} />} label={`${MONTHS[MOCK_TODAY.getMonth()]} oyi`} value={<>{stats.thisMonth} <span className="text-sm font-semibold text-slate-400">kun</span></>} hint="Shu oydagi faol kunlar" />
            </div>

            {/* ---------------- Asosiy ikki ustun ---------------- */}
            <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
              {/* Chap ustun */}
              <div className="space-y-5">
                <StreakCard
                  streak={data.periods}
                  currentStreak={stats.current}
                  longestStreak={stats.longest}
                  total={stats.total}
                  title="Haftalik ko'rinish"
                  actionLabel="Tarix"
                  onActionClick={() => document.getElementById("history")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  howItWorksTitle="Streak qanday ishlaydi?"
                  howItWorksItems={[
                    "Har kuni kamida bitta masala yeching — streak 1 ga oshadi.",
                    "Bir kun o'tkazib yuborsangiz, streak 0 ga tushadi.",
                    "Muzlatgich o'tkazib yuborilgan 1 kunni qoplaydi.",
                  ]}
                />

                {/* Bosqichlar */}
                <Card>
                  <CardHeader
                    icon={<Trophy size={19} />}
                    title="Bosqichlar va mukofotlar"
                    subtitle={`${unlockedCount} / ${MILESTONES.length} bosqich ochildi`}
                    right={
                      claimableCount > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          {claimableCount} ta mukofot kutmoqda
                        </span>
                      ) : undefined
                    }
                  />

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
                    {next ? (
                      <>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Keyingi bosqich: {next.days} kun</p>
                        <div className="mt-0.5 flex items-end justify-between gap-3">
                          <p className="text-xl font-extrabold">Yana {next.days - stats.current} kun qoldi</p>
                          <p className="text-xs font-semibold tabular-nums text-slate-500">{stats.current} / {next.days}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-xl font-extrabold">Barcha bosqichlar ochildi 🎉</p>
                    )}
                    <div
                      className="mt-3 h-2.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700"
                      role="progressbar"
                      aria-valuenow={Math.round(progress)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400 transition-all duration-700" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Yo'l xaritasi */}
                    <div className="-mx-1 mt-5 overflow-x-auto px-1 pb-1">
                      <ol className="flex min-w-[420px] items-center">
                        {MILESTONES.map((m, i) => {
                          const done = stats.longest >= m.days;
                          const prev = i === 0 ? 0 : MILESTONES[i - 1].days;
                          const fill = i === 0 ? 0 : Math.max(0, Math.min(1, (stats.current - prev) / (m.days - prev)));
                          return (
                            <li key={m.days} className="flex flex-1 items-center last:flex-none">
                              {i > 0 && (
                                <span className="relative mx-1 h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                  <span className="absolute inset-y-0 left-0 rounded-full bg-orange-500 transition-all duration-700" style={{ width: `${fill * 100}%` }} />
                                </span>
                              )}
                              <span className="flex flex-col items-center gap-1">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold ring-4 transition ${
                                  done
                                    ? "bg-orange-500 text-white ring-orange-100 dark:ring-orange-500/20"
                                    : "bg-white text-slate-400 ring-slate-100 dark:bg-slate-800 dark:ring-slate-800"
                                }`}>
                                  {done ? <Check size={14} /> : m.days}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">{m.days} kun</span>
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-5">
                    <AchievementGrid
                      achievements={achievements}
                      columns="auto"
                      badgeSize="sm"
                      onAchievementClick={a => {
                        const days = Number(a.id);
                        setHighlight(days);
                        document.getElementById(`ms-${days}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    />
                  </div>

                  {/* Mukofotlar ro'yxati */}
                  <ul className="mt-5 space-y-2">
                    {MILESTONES.map(m => {
                      const unlocked = stats.longest >= m.days;
                      const isClaimed = claimed.includes(m.days);
                      return (
                        <li
                          id={`ms-${m.days}`}
                          key={m.days}
                          className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                            highlight === m.days
                              ? "border-orange-300 bg-orange-50/60 dark:border-orange-500/40 dark:bg-orange-500/5"
                              : "border-slate-100 dark:border-slate-800"
                          }`}
                        >
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            unlocked ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10" : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                          }`}>
                            {unlocked ? <Gift size={18} /> : <Lock size={16} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{m.title}</p>
                            <p className="text-xs text-slate-500">
                              {m.days} kun · <span className="font-semibold text-amber-600">+{m.reward.toLocaleString("uz-UZ")} tanga</span>
                            </p>
                          </div>
                          {isClaimed ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              <Check size={13} /> Olingan
                            </span>
                          ) : unlocked ? (
                            <button
                              onClick={() => claim(m.days, m.reward)}
                              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600 active:scale-95"
                            >
                              Olish
                            </button>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">
                              {Math.max(0, m.days - stats.current)} kun qoldi
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              </div>

              {/* O'ng ustun */}
              <div className="space-y-5">
                {/* Muzlatgich */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/40">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
                        <Snowflake size={22} />
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                        <Coins size={14} className="text-amber-500" /> {coins.toLocaleString("uz-UZ")}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-extrabold">Streak muzlatgichi</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      1 ta o&apos;tkazib yuborilgan kunni qoplaydi va streakingizni saqlaydi.
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      {Array.from({ length: FREEZE_MAX }).map((_, i) => (
                        <span
                          key={i}
                          className={`flex h-11 flex-1 items-center justify-center rounded-xl border transition ${
                            i < freezes
                              ? "border-sky-300 bg-sky-100 text-sky-600 dark:border-sky-500/40 dark:bg-sky-500/15"
                              : "border-dashed border-slate-300 text-slate-300 dark:border-slate-700 dark:text-slate-600"
                          }`}
                        >
                          <Snowflake size={18} />
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-center text-xs text-slate-500">{freezes} / {FREEZE_MAX} muzlatgich</p>

                    <button
                      onClick={buyFreeze}
                      disabled={freezes >= FREEZE_MAX}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                    >
                      <Coins size={16} /> Muzlatgich olish ({FREEZE_PRICE})
                    </button>

                    {stats.frozenDates.length > 0 && (
                      <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-500">Ishlatilgan muzlatgichlar</p>
                        <ul className="mt-2 space-y-1">
                          {stats.frozenDates.slice(0, 3).map(k => (
                            <li key={k} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <Snowflake size={12} className="text-sky-500" /> {formatDate(parseKey(k))}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Haftaning kunlari bo'yicha tahlil */}
                <Card>
                  <CardHeader
                    icon={<TrendingUp size={19} />}
                    title="Faollik tahlili"
                    subtitle={
                      stats.bestWeekday !== null
                        ? `Eng faol kuningiz: ${WEEKDAYS_FULL[stats.bestWeekday]}`
                        : "Hali ma'lumot yo'q"
                    }
                  />
                  <div className="mt-5 flex h-36 items-end gap-2">
                    {stats.weekday.map((count, i) => {
                      const h = stats.maxWeekday ? Math.max(6, (count / stats.maxWeekday) * 100) : 6;
                      const best = stats.bestWeekday === i;
                      return (
                        <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                          <span className="text-[10px] font-semibold tabular-nums text-slate-400 opacity-0 transition group-hover:opacity-100">
                            {count}
                          </span>
                          <div
                            className={`w-full rounded-lg transition-all duration-700 ${
                              best ? "bg-gradient-to-t from-orange-500 to-amber-400" : "bg-slate-200 dark:bg-slate-700"
                            }`}
                            style={{ height: `${h}%` }}
                            title={`${WEEKDAYS_FULL[i]}: ${count} kun`}
                          />
                          <span className={`text-[11px] font-medium ${best ? "text-orange-600" : "text-slate-400"}`}>
                            {WEEKDAYS_SHORT[i]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            </div>

            {/* ---------------- Faollik tarixi ---------------- */}
            <Card className="scroll-mt-6">
              <div id="history" />
              <CardHeader
                icon={<CalendarDays size={19} />}
                title="Faollik tarixi"
                subtitle="Kunni bosing — tafsilotlarini ko'ring"
                right={
                  <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
                    {(["month", "year"] as const).map(v => (
                      <button
                        key={v}
                        onClick={() => { setCalView(v); setPickedDay(null); }}
                        className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                          calView === v
                            ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                            : "text-slate-500"
                        }`}
                      >
                        {v === "month" ? "Oy" : "Yil"}
                      </button>
                    ))}
                  </div>
                }
              />

              {calView === "month" && (
                <div className="mt-5 flex items-center justify-between">
                  <button
                    onClick={() => setMonthOffset(o => o - 1)}
                    aria-label="Oldingi oy"
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <p className="text-sm font-bold">{MONTHS[shownMonth.getMonth()]} {shownMonth.getFullYear()}</p>
                  <button
                    onClick={() => setMonthOffset(o => Math.min(0, o + 1))}
                    disabled={monthOffset >= 0}
                    aria-label="Keyingi oy"
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <div className="mt-4 overflow-x-auto">
                <div className={calView === "month" ? "mx-auto max-w-md" : "min-w-[640px]"}>
                  {calView === "month" ? (
                    <StreakCalendar
                      key={`m-${monthOffset}`}
                      streak={data.periods}
                      view="month"
                      month={shownMonth}
                      startOfWeek={1}
                      showFreezes
                      onDayClick={(date, wasActive) => setPickedDay({ date, wasActive })}
                    />
                  ) : (
                    <StreakCalendar
                      streak={data.periods}
                      view="year"
                      startOfWeek={1}
                      showFreezes
                      onDayClick={(date, wasActive) => setPickedDay({ date, wasActive })}
                    />
                  )}
                </div>
              </div>

              {pickedDay && pickedStatus && (
                <div
                  className={`mt-4 flex items-center gap-3 rounded-2xl p-3 text-sm ${
                    pickedStatus.tone === "orange"
                      ? "bg-orange-50 text-orange-800 dark:bg-orange-500/10 dark:text-orange-300"
                      : pickedStatus.tone === "sky"
                        ? "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {pickedStatus.tone === "sky" ? <Snowflake size={16} /> : pickedStatus.tone === "orange" ? <Flame size={16} /> : <CalendarDays size={16} />}
                  <span className="font-bold">{formatDate(pickedDay.date)}</span>
                  <span>— {pickedStatus.label}</span>
                  <button onClick={() => setPickedDay(null)} className="ml-auto text-xs font-semibold opacity-60 hover:opacity-100">
                    Yopish
                  </button>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" /> Yechilgan</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Muzlatgich</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-200 dark:bg-slate-700" /> O&apos;tkazib yuborilgan</span>
                <span className="ml-auto font-medium">{stats.total} ta faol kun</span>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Toast */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast && (
          <div
            className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${
              toast.type === "ok" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-red-600 text-white"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </main>
  );
}