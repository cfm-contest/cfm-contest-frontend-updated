"use client";

import { useMemo } from "react";
import useSWR from "swr";
// npx shadcn@latest add https://ui.trophy.so/leaderboard-card
import { LeaderboardCard } from "@/components/ui/leaderboard-card";
import { ApiError, fetcher } from "@/lib/api/tests/client";
import type { LeaderboardResponse } from "@/lib/api/tests/types";
import { Empty } from "./ResultPanel";

interface Props {
  slug: string;
  title: string;
  start: string;
  end: string;
}

export default function LeaderboardPanel({ slug, title, start, end }: Props) {
  const { data, error, isLoading } = useSWR<LeaderboardResponse, ApiError>(
    `${slug}/liaderbar?limit=100&offset=0`,
    fetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const { rankings, podium } = useMemo(() => {
    const rankings = (data?.items ?? []).map((i) => ({
      userId: i.uid,
      rank: i.rank,
      userName: i.user,
      byline: `${i.grade || "—"} · ${i.correct} ta to‘g‘ri`,
      value: Number(i.ball),
      displayed: true,
    }));
    const podium = rankings
      .slice(0, 3)
      .map(({ userId, userName, rank, value }) => ({ userId, userName, rank, value }));
    return { rankings, podium };
  }, [data]);

  if (isLoading) return <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />;

  if (error) {
    return (
      <Empty
        title={error.status === 400 ? "Reyting hali tayyor emas" : "Reytingni yuklab bo‘lmadi"}
        text={error.message}
      />
    );
  }

  if (rankings.length === 0) {
    return <Empty title="Hozircha natijalar yo‘q" text="Bu testni hech kim yakunlamagan." />;
  }

  const me = data?.me;
  const meOutside = me && !rankings.some((r) => r.userId === me.uid);

  return (
    <div className="space-y-4">
      {meOutside && me && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm">
          <span className="font-semibold text-amber-900">Sizning o‘rningiz: #{me.rank}</span>
          <span className="tabular-nums text-amber-800">
            {Number(me.ball).toFixed(2)} ball · {me.grade || "—"}
          </span>
        </div>
      )}

      <LeaderboardCard
        title={title}
        fromDate={start}
        toDate={end}
        currentUserId={me?.uid}
        podiumRankings={podium}
        rankings={rankings}
      />

      {data?.hn && (
        <p className="text-center text-xs text-slate-400">Dastlabki 100 ta ishtirokchi ko‘rsatilgan.</p>
      )}
    </div>
  );
}
