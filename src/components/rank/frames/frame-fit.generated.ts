import type { RankLevel } from "../types";

export const GENERATED_FIT: Record<RankLevel, { d: number; cx: number; cy: number }> = {
  beginner: { d: 0.598, cx: 0.5, cy: 0.515 },
  bronze: { d: 0.569, cx: 0.502, cy: 0.522 },
  silver: { d: 0.573, cx: 0.501, cy: 0.52 },
  gold: { d: 0.533, cx: 0.496, cy: 0.547 },
  platinum: { d: 0.524, cx: 0.494, cy: 0.551 },
  emerald: { d: 0.54, cx: 0.486, cy: 0.513 },
  diamond: { d: 0.545, cx: 0.504, cy: 0.529 },
  master: { d: 0.528, cx: 0.496, cy: 0.542 },
  grandmaster: { d: 0.55, cx: 0.511, cy: 0.522 },
  immortal: { d: 0.52, cx: 0.5, cy: 0.5 },
};
