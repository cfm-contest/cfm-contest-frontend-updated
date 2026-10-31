// app/contests/ContestListClient.tsx
"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Dumbbell,
  ListChecks,
  Loader2,
  Lock,
  Search,
  Timer,
  Trophy,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  ApiError,
  SCORING_LABEL,
  getContests,
  type CompactContest,
  type CompactContestResponse,
  type ContestStatus,
  type ContestType,
} from "@/lib/api/contests/contests";
import {
  Countdown,
  EmptyState,
  StatusBadge,
  dateTileParts,
  formatDuration,
} from "@/components/contests/contest-ui";

const PAGE_SIZE = 20;

const TYPE_TABS: { value: ContestType; label: string; icon: React.ElementType }[] = [
  { value: "public", label: "Rasmiy", icon: Trophy },
  { value: "gym", label: "Mashg'ulot", icon: Dumbbell },
  { value: "private", label: "Maxfiy", icon: Lock },
];

const STATUS_FILTERS: { value: ContestStatus | "all"; label: string }[] = [
  { value: "all", label: "Barchasi" },
  { value: "ongoing", label: "Davom etayotgan" },
  { value: "upcoming", label: "Kutilayotgan" },
  { value: "ended", label: "Yakunlangan" },
];

const GROUP_TITLE: Record<ContestStatus, string> = {
  ongoing: "Davom etayotgan",
  upcoming: "Kutilayotgan",
  ended: "Yakunlangan",
};

interface Props {
  initialContests: CompactContestResponse;
  currentType: ContestType;
  currentStatus?: ContestStatus;
  currentSearch: string;
}

export default function ContestListClient({
  initialContests,
  currentType,
  currentStatus,
  currentSearch,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(currentSearch);

  const updateParams = useCallback(
    (changes: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "" || value === "undefined") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const q = query.trim();
    if (q === currentSearch) return;
    const id = setTimeout(() => updateParams({ search: q || null }), 400);
    return () => clearTimeout(id);
  }, [query, currentSearch, updateParams]);

  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 dark:bg-black dark:text-zinc-100 sm:py-12">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Luxury Hero Card */}
        <div className="relative isolate mb-8 overflow-hidden rounded-3xl border border-white/10 bg-black p-6 text-white shadow-2xl shadow-black/20 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-24 -top-24 z-0 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-[28rem]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 backdrop-blur">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Olimpiadalar & Musobaqalar
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                <Trophy className="size-3.5 text-amber-400" /> Rasmiy & Gym turnirlari
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Algoritmik Musobaqalar va Fan Olimpiadalari
            </h1>
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              O‘zbekiston o‘quvchilari va talabalari uchun IOI va ICPC formatidagi dasturlash musobaqalari, jamoaviy bahslar va amaliy mashg‘ulotlar.
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <div className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={currentType}
              onValueChange={(value) => updateParams({ type: value === "public" ? null : value })}
            >
              <TabsList className="w-full rounded-2xl bg-slate-100 p-1 dark:bg-zinc-900 md:w-auto">
                {TYPE_TABS.map(({ value, label, icon: Icon }) => (
                  <TabsTrigger key={value} value={value} className="gap-2 rounded-xl px-4 text-xs font-semibold sm:text-sm">
                    <Icon className="size-4" />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Musobaqa nomi bo'yicha qidirish..."
                className="h-11 rounded-2xl border-slate-200/80 bg-slate-50 pl-10 pr-9 text-sm dark:border-white/10 dark:bg-zinc-900"
                aria-label="Musobaqalarni qidirish"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-white"
                  aria-label="Qidiruvni tozalash"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex gap-1.5 overflow-x-auto border-t border-slate-100 pt-3 dark:border-white/5" role="group" aria-label="Holat bo'yicha filtr">
            {STATUS_FILTERS.map(({ value, label }) => {
              const active = value === "all" ? !currentStatus : currentStatus === value;
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={active ? "default" : "ghost"}
                  aria-pressed={active}
                  onClick={() => updateParams({ status: value === "all" ? null : value })}
                  className={cn(
                    "rounded-xl text-xs font-semibold shrink-0",
                    active
                      ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                      : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white",
                  )}
                >
                  {label}
                </Button>
              );
            })}
          </div>
        </div>

        {isPending ? (
          <FeedSkeleton />
        ) : (
          <ContestFeed
            key={`${currentType}|${currentStatus ?? ""}|${currentSearch}`}
            initial={initialContests}
            type={currentType}
            status={currentStatus}
            search={currentSearch}
          />
        )}
      </div>
    </main>
  );
}

function ContestFeed({
  initial,
  type,
  status,
  search,
}: {
  initial: CompactContestResponse;
  type: ContestType;
  status?: ContestStatus;
  search: string;
}) {
  const [items, setItems] = useState(initial.rs);
  const [hasNext, setHasNext] = useState(initial.hn);
  const [nextOffset, setNextOffset] = useState(initial.no);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offsetMs] = useState(() => new Date(initial.sn).getTime() - Date.now());

  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasNext || nextOffset === null) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await getContests({ limit: PAGE_SIZE, offset: nextOffset, type, status, search });
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.i));
        return [...prev, ...data.rs.filter((c) => !seen.has(c.i))];
      });
      setHasNext(data.hn);
      setNextOffset(data.no);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Yuklab bo'lmadi.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [hasNext, nextOffset, type, status, search]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNext || error) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, error, loadMore]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={type === "private" ? Lock : Trophy}
        title="Musobaqalar topilmadi"
        text={
          type === "private"
            ? "Maxfiy musobaqalar faqat ro'yxatdan o'tgan yoki yaratgan foydalanuvchilarga ko'rinadi."
            : "Tanlangan filtr yoki qidiruv bo'yicha natija yo'q."
        }
      />
    );
  }

  const groups: { key: string; title: string | null; items: CompactContest[] }[] = status
    ? [{ key: status, title: null, items }]
    : (["ongoing", "upcoming", "ended"] as const)
        .map((s) => ({ key: s, title: GROUP_TITLE[s], items: items.filter((c) => c.ss === s) }))
        .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.key} className="space-y-3">
          {group.title ? (
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">{group.title}</h2>
              <Badge variant="secondary" className="tabular-nums">
                {group.items.length}
              </Badge>
            </div>
          ) : null}
          <ul className="space-y-2.5">
            {group.items.map((contest) => (
              <ContestRow key={contest.i} contest={contest} offsetMs={offsetMs} />
            ))}
          </ul>
        </div>
      ))}

      <div ref={sentinel} className="flex min-h-10 items-center justify-center">
        {loading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Yuklanmoqda
          </span>
        ) : null}
        {error ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">{error}</span>
            <Button size="sm" variant="outline" onClick={loadMore}>
              Qayta urinish
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DateTile({ contest }: { contest: CompactContest }) {
  if (contest.y === "gym") {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300">
        <Dumbbell className="size-6" />
      </div>
    );
  }
  const { day, month } = dateTileParts(contest.st);
  return (
    <div
      className={cn(
        "flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 leading-none dark:border-white/10 dark:bg-zinc-800/80",
        contest.ss === "ongoing" && "border-amber-500/50 bg-amber-50/50 dark:border-amber-400/40 dark:bg-amber-400/10",
        contest.ss === "ended" && "text-slate-400 dark:text-zinc-500",
      )}
    >
      <span className="text-lg font-black tabular-nums">{day}</span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">{month}</span>
    </div>
  );
}

function TimeStatus({ contest, offsetMs }: { contest: CompactContest; offsetMs: number }) {
  if (contest.ss === "ended") {
    return <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">Yakunlangan</span>;
  }
  const isLive = contest.ss === "ongoing";
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
        {isLive ? "Tugashiga" : "Boshlanishiga"}
      </span>
      <Countdown
        target={isLive ? contest.et : contest.st}
        offsetMs={offsetMs}
        className={cn("text-sm font-bold", isLive ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white")}
      />
    </div>
  );
}

function ContestRow({ contest, offsetMs }: { contest: CompactContest; offsetMs: number }) {
  const live = contest.ss === "ongoing";
  const isGym = contest.y === "gym";
  const startTime = dateTileParts(contest.st).time;

  return (
    <li
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/90 dark:hover:border-white/20 sm:rounded-3xl sm:p-5",
        live && "border-amber-500/30 bg-amber-50/20 dark:border-amber-400/30 dark:bg-amber-400/[0.04]",
      )}
    >
      <DateTile contest={contest} />

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {contest.y === "private" ? <Lock className="size-3.5 text-slate-400 dark:text-zinc-500" /> : null}
          <Link
            href={`/contests/${contest.s}`}
            className="truncate font-bold text-slate-950 outline-none after:absolute after:inset-0 after:rounded-2xl transition-colors hover:text-amber-600 dark:text-white dark:hover:text-amber-400 focus-visible:after:ring-2 focus-visible:after:ring-amber-500"
          >
            {contest.t}
          </Link>
          {!isGym ? <StatusBadge status={contest.ss} /> : null}
          <Badge variant="outline" className="rounded-full border-slate-200 text-xs font-normal dark:border-white/10">
            {SCORING_LABEL[contest.ct]}
          </Badge>
          {contest.ir ? <Badge variant="outline" className="rounded-full border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-700 dark:text-amber-400">Reytingli</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
          {!isGym ? (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> Boshlanishi {startTime}
            </span>
          ) : null}
          {!isGym ? (
            <span className="inline-flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {formatDuration(contest.d)}
              {contest.pmode === "INDIVIDUAL" ? " (shaxsiy vaqt)" : ""}
            </span>
          ) : null}
          {contest.p !== null ? (
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="size-3.5" /> {contest.p} ta masala
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" /> {contest.pc} ishtirokchi
          </span>
          {contest.r ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" /> Ro‘yxatdan o‘tgansiz
            </span>
          ) : null}
        </div>
      </div>

      {!isGym ? (
        <div className="hidden shrink-0 sm:block">
          <TimeStatus contest={contest} offsetMs={offsetMs} />
        </div>
      ) : null}
    </li>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Yuklanmoqda">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-white/10 dark:bg-zinc-900">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="hidden h-8 w-24 sm:block" />
        </div>
      ))}
    </div>
  );
}
