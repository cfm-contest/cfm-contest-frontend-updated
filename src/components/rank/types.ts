export const RANK_LEVELS = [
  "beginner",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "immortal",
] as const;

export type RankLevel = (typeof RANK_LEVELS)[number];

export interface RankBadgeProps {
  image?: string | null;
  size?: number;
  alt?: string;
  className?: string;
  /** Bosilganda pop + uchqun effekti (default: true) */
  interactive?: boolean;
  /** Doimiy animatsiyalar: yaltirash, jaqmoqchalar, orbitalar (default: true) */
  animated?: boolean;
  /** Fireworks ovozi, faqat grandmaster va immortal (default: false) */
  sound?: boolean;
  /**
   * Bosilganda katta effekt: canvas-confetti (gold+) va butun ekran
   * fireworks (grandmaster, immortal). Default: size >= 80
   */
  celebrate?: boolean;
}

export interface RankFrameProps {
  size: number;
  rank: RankLevel;
  animated?: boolean;
  className?: string;
}
