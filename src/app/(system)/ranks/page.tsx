"use client";

import {
  RANK_LEVELS,
  RANK_THRESHOLDS,
  RankAvatar,
  RankChip,
} from "@/components/rank";

export default function RankDemoPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-10 p-6">
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {RANK_LEVELS.map((rank) => (
          <div key={rank} className="flex flex-col items-center gap-3 rounded-2xl border bg-white p-6 dark:bg-neutral-900">
            <div className="flex items-center justify-center" style={{ minHeight: 170 + 16 }}>
              <RankAvatar rank={rank} image="/cfm_logo.webp" size={170} animated={true} sound={true} />
            </div>
            <RankChip level={rank} />
            <span className="text-xs tabular-nums text-neutral-500">{RANK_THRESHOLDS[rank].toLocaleString("en-US")} XP</span>
          </div>
        ))}
      </section>
    </main>
  );
}
