"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Search, Swords, Trophy, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ApiError,
  getParticipants,
  getStandings,
  getSubmissions,
  type ParticipantRow,
  type ParticipantsResponse,
  type ScoringType,
  type StandingRow,
  type StandingsResponse,
  type SubmissionRow,
  type SubmissionsResponse,
} from "@/lib/api/contests/contests";
import {
  EmptyState,
  UserAvatar,
  formatDateTime,
  formatHM,
  formatScore,
} from "@/components/contests/contest-ui";
import { LeaderboardCard } from "../ui/leaderboard-card";
import { LeaderboardPodium } from "../ui/leaderboard-podium";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

// =========================================================
// Umumiy: sahifalab yuklash hooki
// `no` — offset (standings, users) yoki cursor (submissions): hook farqini bilmaydi.
// =========================================================

interface PageShape<I> {
  hn: boolean;
  no: number | null;
  rs: I[];
}

function usePaged<I, R extends PageShape<I>>(
  fetchPage: (cursor: number | null, signal: AbortSignal) => Promise<R>,
  deps: React.DependencyList,
) {
  const [state, setState] = useState<{
    items: I[];
    last: R | null;
    loading: boolean;
    error: string | null;
  }>({ items: [], last: null, loading: true, error: null });

  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (cursor: number | null, reset: boolean) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setState((s) => ({ ...s, loading: true, error: null, ...(reset ? { items: [], last: null } : {}) }));
    try {
      const data = await fetchRef.current(cursor, ac.signal);
      if (ac.signal.aborted) return;
      setState((s) => ({
        items: reset ? data.rs : [...s.items, ...data.rs],
        last: data,
        loading: false,
        error: null,
      }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof ApiError ? e.message : "Ma'lumotni yuklab bo'lmadi.",
      }));
    }
  }, []);

  useEffect(() => {
    load(null, true);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const next = state.last?.no ?? null;
  return {
    items: state.items,
    last: state.last,
    loading: state.loading,
    error: state.error,
    hasNext: state.last?.hn ?? false,
    loadMore: () => {
      if (next !== null && !state.loading) load(next, false);
    },
    reload: () => load(null, true),
  };
}

function useDebounced<T>(value: T, delay = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

interface Feed {
  items: unknown[];
  loading: boolean;
  error: string | null;
  hasNext: boolean;
  loadMore: () => void;
  reload: () => void;
}

function FeedFooter({ feed }: { feed: Feed }) {
  if (feed.error) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 text-sm">
        <span className="text-destructive">{feed.error}</span>
        <Button size="sm" variant="outline" onClick={feed.items.length ? feed.loadMore : feed.reload}>
          Qayta urinish
        </Button>
      </div>
    );
  }
  if (feed.loading && feed.items.length > 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Yuklanmoqda
      </div>
    );
  }
  if (feed.hasNext) {
    return (
      <div className="flex justify-center py-4">
        <Button variant="outline" size="sm" onClick={feed.loadMore}>
          Yana yuklash
        </Button>
      </div>
    );
  }
  return null;
}

function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}

// =========================================================
// REYTING
// =========================================================

function RankCell({ n }: { n: number }) {
  const medal =
    n === 1
      ? "bg-amber-400/20 text-amber-700 dark:text-amber-400"
      : n === 2
        ? "bg-slate-400/20 text-slate-600 dark:text-slate-300"
        : n === 3
          ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
          : "text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        medal,
      )}
    >
      {n}
    </span>
  );
}

function ProblemCell({
  cell,
  scoring,
}: {
  cell: StandingRow["ps"][string] | undefined;
  scoring: ScoringType;
}) {
  if (!cell || (!cell.s && cell.at === 0)) {
    return <span className="text-muted-foreground/50">–</span>;
  }
  if (cell.s) {
    return (
      <div className="leading-tight text-emerald-700 dark:text-emerald-400">
        <div className="font-semibold tabular-nums">
          {scoring === "icpc" ? (cell.wa > 0 ? `+${cell.wa}` : "+") : formatScore(cell.sc)}
        </div>
        {cell.t !== null ? (
          <div className="text-[11px] tabular-nums opacity-80">{formatHM(cell.t)}</div>
        ) : null}
      </div>
    );
  }
  return (
    <span className="font-semibold tabular-nums text-destructive">
      −{cell.wa || cell.at}
    </span>
  );
}


export function StandingsTab({
  slug,
  scoring,
}: {
  slug: string;
  scoring: ScoringType;
}) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());

  const feed = usePaged<StandingRow, StandingsResponse>(
    (cursor, signal) =>
      getStandings(
        slug,
        {
          limit: 30,
          offset: cursor ?? 0,
          search: q,
        },
        signal,
      ),
    [slug, q],
  );

  const cols = feed.last?.cols ?? [];
  const isIcpc = scoring === "icpc";

  // Podium faqat real API ma'lumotlaridan tuziladi.
  const podiumRankings = feed.items
    .filter((row) => row.n >= 1 && row.n <= 3)
    .sort((a, b) => a.n - b.n)
    .map((row) => ({
      userId: String(row.i),
      userName: row.fn || row.u,
      rank: row.n,
      value: Number(row.sc),
      avatarUrl: row.a ?? undefined,
    }));

  return (
    <div className="space-y-4">
      {/* Qidiruv va yangilash */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Ishtirokchini qidirish"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={feed.reload}
          disabled={feed.loading}
        >
          <RefreshCw
            className={cn(
              "size-4",
              feed.loading && "animate-spin",
            )}
          />
          Yangilash
        </Button>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        {feed.loading && feed.items.length === 0 ? (
          <RowsSkeleton />
        ) : feed.items.length === 0 && !feed.error ? (
          <div className="p-4">
            <EmptyState
              icon={Trophy}
              title="Reyting hali bo'sh"
              text="Birinchi natijalar paydo bo'lganda shu yerda ko'rinadi."
            />
          </div>
        ) : (
          <>
            {/* Real API reytingi asosidagi podium */}
            {podiumRankings.length > 0 && (
              <section className="border-b bg-gradient-to-b from-muted/40 to-background px-3 py-8 sm:px-6">
                <div className="mx-auto w-full max-w-2xl">
                  <h3 className="mb-8 text-center text-sm font-semibold text-muted-foreground">
                    Top ishtirokchilar
                  </h3>

                  <LeaderboardPodium
                    size="default"
                    rankings={podiumRankings}
                    showValue
                    showAvatar
                    medalStyle="modern"
                    className="mx-auto"
                  />
                </div>
              </section>
            )}

            {/* Jadval: gorizontal va touch scroll */}
            <div className="min-w-0">
              <ScrollArea className="w-full whitespace-nowrap">
                <Table className="w-max min-w-full border-collapse">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="sticky left-0 z-30 w-14 min-w-14 border-r bg-muted px-3 py-3 text-center text-xs">
                        O'rin
                      </TableHead>

                      <TableHead className="sticky left-14 z-30 w-52 min-w-52 border-r bg-muted px-3 py-3 text-xs">
                        Ishtirokchi
                      </TableHead>

                      <TableHead className="w-24 min-w-24 px-3 py-3 text-right text-xs">
                        Ball
                      </TableHead>

                      {isIcpc && (
                        <TableHead className="w-20 min-w-20 px-3 py-3 text-right text-xs">
                          Jarima
                        </TableHead>
                      )}

                      {cols.map((letter) => (
                        <TableHead
                          key={letter}
                          className="w-16 min-w-16 px-2 py-3 text-center text-xs font-semibold"
                        >
                          {letter}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {feed.items.map((row) => (
                      <TableRow
                        key={row.i}
                        className="h-14 transition-colors hover:bg-muted/40"
                      >
                        <TableCell className="sticky left-0 z-20 w-14 min-w-14 border-r bg-card px-2 py-2 text-center">
                          <RankCell n={row.n} />
                        </TableCell>

                        <TableCell className="sticky left-14 z-20 w-52 min-w-52 border-r bg-card px-3 py-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <UserAvatar
                              name={row.fn}
                              username={row.u}
                              src={row.a}
                              className="size-8 shrink-0"
                            />

                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="truncate text-xs font-semibold">
                                {row.fn || row.u}
                              </div>

                              {row.fn && row.u && (
                                <div className="truncate text-[11px] text-muted-foreground">
                                  @{row.u}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="w-24 min-w-24 px-3 py-2 text-right text-xs font-bold tabular-nums">
                          {formatScore(row.sc)}
                        </TableCell>

                        {isIcpc && (
                          <TableCell className="w-20 min-w-20 px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                            {row.pen ?? 0}
                          </TableCell>
                        )}

                        {cols.map((letter) => (
                          <TableCell
                            key={letter}
                            className="w-16 min-w-16 px-2 py-2 text-center"
                          >
                            <ProblemCell
                              cell={row.ps[letter]}
                              scoring={scoring}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        )}

        {/* Xatolik va keyingi sahifani yuklash */}
        <FeedFooter feed={feed} />
      </div>
    </div>
  );
}



// =========================================================
// URINISHLAR
// =========================================================

function verdictStyle(verdict: string): { label: string; className: string } {
  const v = verdict.toLowerCase();
  const label = verdict.replace(/_/g, " ");
  if (v === "ac" || v === "ok" || v.includes("accept")) {
    return { label, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" };
  }
  if (v === "wa" || v.includes("wrong")) {
    return { label, className: "border-destructive/30 bg-destructive/10 text-destructive" };
  }
  if (v.includes("pend") || v.includes("queue") || v.includes("judg") || v.includes("running")) {
    return { label, className: "border-border bg-muted text-muted-foreground" };
  }
  return { label, className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400" };
}

export function SubmissionsTab({
  slug,
  letters,
  canFilterMine,
}: {
  slug: string;
  letters: string[];
  canFilterMine: boolean;
}) {
  const [mine, setMine] = useState(false);
  const [problem, setProblem] = useState("all");

  const feed = usePaged<SubmissionRow, SubmissionsResponse>(
    (cursor, signal) =>
      getSubmissions(
        slug,
        {
          limit: 30,
          cursor: cursor ?? undefined,
          mine,
          problem: problem === "all" ? undefined : problem,
        },
        signal,
      ),
    [slug, mine, problem],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canFilterMine ? (
          <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Urinishlar filtri">
            {[
              { v: false, label: "Hammasi" },
              { v: true, label: "Mening" },
            ].map((o) => (
              <Button
                key={o.label}
                size="sm"
                variant={mine === o.v ? "secondary" : "ghost"}
                aria-pressed={mine === o.v}
                onClick={() => setMine(o.v)}
                className={cn("h-7", mine === o.v && "bg-background shadow-sm")}
              >
                {o.label}
              </Button>
            ))}
          </div>
        ) : null}

        {letters.length > 0 ? (
          <Select value={problem} onValueChange={setProblem}>
            <SelectTrigger className="h-9 w-36" aria-label="Masala bo'yicha filtr">
              <SelectValue placeholder="Masala" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha masalalar</SelectItem>
              {letters.map((l) => (
                <SelectItem key={l} value={l}>
                  {l} masala
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Button variant="outline" size="sm" className="ml-auto" onClick={feed.reload} disabled={feed.loading}>
          <RefreshCw className={cn("size-4", feed.loading && "animate-spin")} />
          Yangilash
        </Button>
      </div>

      <div className="rounded-xl border bg-card">
        {feed.loading && feed.items.length === 0 ? (
          <RowsSkeleton />
        ) : feed.items.length === 0 && !feed.error ? (
          <div className="p-4">
            <EmptyState
              icon={Swords}
              title="Urinishlar yo'q"
              text="Yuborilgan yechimlar shu yerda ko'rinadi. Kod ko'rsatilmaydi, faqat natija."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">ID</TableHead>
                <TableHead>Vaqt</TableHead>
                <TableHead>Ishtirokchi</TableHead>
                <TableHead>Masala</TableHead>
                <TableHead>Til</TableHead>
                <TableHead>Natija</TableHead>
                <TableHead className="text-right">Testlar</TableHead>
                {/* Backend birligi aniq emas: vaqt ms, xotira KB deb olingan */}
                <TableHead className="text-right">Vaqt / xotira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feed.items.map((s) => {
                const verdict = verdictStyle(s.v);
                return (
                  <TableRow key={s.i}>
                    <TableCell className="tabular-nums text-muted-foreground">#{s.i}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(s.at)}
                    </TableCell>
                    <TableCell className="text-sm">{s.fn || s.u}</TableCell>
                    <TableCell className="text-sm">
                      {s.l ? <span className="mr-1.5 font-semibold">{s.l}</span> : null}
                      <span className="text-muted-foreground">{s.pt}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.lg}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-medium capitalize", verdict.className)}>
                        {verdict.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {s.pc}/{s.tc}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                      {s.t ?? "—"} ms / {s.m ?? "—"} KB
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <FeedFooter feed={feed} />
      </div>
    </div>
  );
}

// =========================================================
// ISHTIROKCHILAR
// =========================================================

export function ParticipantsTab({ slug }: { slug: string }) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());

  const feed = usePaged<ParticipantRow, ParticipantsResponse>(
    (cursor, signal) => getParticipants(slug, { limit: 30, offset: cursor ?? 0, search: q }, signal),
    [slug, q],
  );

  return (
    <div className="space-y-3">
      <LeaderboardCard
  title="Weekly Leaderboard"
  fromDate="2026-05-01"
  toDate="2026-05-07"
  currentUserId="u-5"
  podiumRankings={[
    { userId: "u-1", userName: "Ava Elizabeth Turner", rank: 1, value: 289400 },
    { userId: "u-2", userName: "Leo Harrison", rank: 2, value: 251800 },
    { userId: "u-3", userName: "Rowan Elijah", rank: 3, value: 238300 },
  ]}
  rankings={[
    {
      userId: "u-1",
      rank: 1,
      userName: "Ava Elizabeth Turner",
      byline: "Level 42 - Diamond",
      value: 289400,
      displayed: true,
    },
    {
      userId: "u-2",
      rank: 2,
      userName: "Leo Harrison",
      byline: "Level 39 - Platinum",
      value: 251800,
      displayed: true,
    },
    {
      userId: "u-3",
      rank: 3,
      userName: "Rowan Elijah",
      byline: "Level 37 - Platinum",
      value: 238300,
      displayed: true,
    },
    {
      userId: "u-4",
      rank: 4,
      userName: "Mia Sophia Bennett",
      byline: "Level 34 - Gold",
      value: 221700,
      displayed: false,
    },
    {
      userId: "u-5",
      rank: 5,
      userName: "Olivia Reed",
      byline: "Level 32 - Gold",
      value: 210900,
      displayed: true,
    },
    {
      userId: "u-6",
      rank: 6,
      userName: "William Turner",
      byline: "Level 31 - Gold",
      value: 199500,
      displayed: false,
    },
    {
      userId: "u-7",
      rank: 7,
      userName: "Ruby Claire",
      byline: "Level 29 - Silver",
      value: 198300,
      displayed: false,
    },
    {
      userId: "u-8",
      rank: 8,
      userName: "Ethan Brooks",
      byline: "Level 28 - Silver",
      value: 187200,
      displayed: true,
    },
    {
      userId: "u-9",
      rank: 9,
      userName: "Chloe Madison",
      byline: "Level 27 - Silver",
      value: 176800,
      displayed: true,
    },
    {
      userId: "u-10",
      rank: 10,
      userName: "Noah Bennett",
      byline: "Level 26 - Silver",
      value: 169300,
      displayed: false,
    },
  ]}
/>
      <SearchBox value={search} onChange={setSearch} placeholder="Ism yoki @username" />

      <div className="rounded-xl border bg-card">
        {feed.loading && feed.items.length === 0 ? (
          <RowsSkeleton />
        ) : feed.items.length === 0 && !feed.error ? (
          <div className="p-4">
            <EmptyState icon={Users} title="Ishtirokchilar topilmadi" />
          </div>
        ) : (
          <ul className="divide-y">
            {feed.items.map((p) => (
              <li key={p.i} className="flex items-center gap-3 px-4 py-3">
                <span className="w-8 text-sm tabular-nums text-muted-foreground">{p.n}</span>
                <UserAvatar name={p.fn} username={p.u} src={p.a} className="size-9" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-sm font-medium">{p.fn || p.u}</div>
                  {p.fn && p.u ? (
                    <div className="truncate text-xs text-muted-foreground">@{p.u}</div>
                  ) : null}
                </div>
                <Badge variant="secondary" className="capitalize">
                  {p.lv}
                </Badge>
                <span className="w-20 text-right text-sm font-semibold tabular-nums">{p.xp} XP</span>
              </li>
            ))}
          </ul>
        )}
        <FeedFooter feed={feed} />
      </div>
    </div>
  );
}
