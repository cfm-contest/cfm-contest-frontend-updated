import { RANK_LEVELS, type RankLevel } from "./types";

/** Django UserStats.LEVEL_THRESHOLDS bilan bir xil bo'lishi shart */
export const RANK_THRESHOLDS: Record<RankLevel, number> = {
  beginner: 0,
  bronze: 1_500,
  silver: 5_000,
  gold: 10_000,
  platinum: 18_000,
  emerald: 28_000,
  diamond: 40_000,
  master: 55_000,
  grandmaster: 75_000,
  immortal: 100_000,
};

/** Backenddan kelgan ixtiyoriy string -> aniq RankLevel */
export function normalizeRank(level?: string | null): RankLevel {
  const v = level?.trim().toLowerCase();
  return (RANK_LEVELS as readonly string[]).includes(v ?? "") ? (v as RankLevel) : "beginner";
}

export function rankIndex(rank: RankLevel): number {
  return RANK_LEVELS.indexOf(rank);
}

/** XP -> daraja (faqat ko'rsatish uchun; haqiqiy manba — backend) */
export function rankFromXp(xp: number): RankLevel {
  let result: RankLevel = "beginner";
  for (const r of RANK_LEVELS) if (xp >= RANK_THRESHOLDS[r]) result = r;
  return result;
}

export function getRankProgress(xp: number) {
  const rank = rankFromXp(xp);
  const idx = rankIndex(rank);
  const nextRank = RANK_LEVELS[idx + 1] ?? null;
  if (!nextRank) return { rank, nextRank, percent: 100, xpToNext: 0, currentMin: RANK_THRESHOLDS[rank], nextMin: null };

  const currentMin = RANK_THRESHOLDS[rank];
  const nextMin = RANK_THRESHOLDS[nextRank];
  const percent = Math.max(0, Math.min(100, Math.round(((xp - currentMin) / (nextMin - currentMin)) * 100)));
  return { rank, nextRank, percent, xpToNext: Math.max(0, nextMin - xp), currentMin, nextMin };
}

/** 12400 -> "12 400" (SSR/CSR farq qilmasligi uchun locale ishlatilmaydi) */
export const formatXp = (n: number) => n.toLocaleString("en-US").replace(/,/g, " ");
