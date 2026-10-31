import type { RankLevel } from "../types";

export type ParticleKind = "spark" | "dot" | "star" | "ember";
export type AmbientKind = "none" | "mote" | "ember";

export interface FrameEffect {
  /** Ramka atrofida miltillovchi yulduzchalar soni */
  sparkles: number;
  /** Teshik chetida aylanuvchi yorug' nuqtalar soni */
  orbiters: number;
  /** Rasm bo'ylab yaltirash o'tishi davomiyligi (soniya). 0 = yo'q */
  shineSeconds: number;
  /** Doimiy havoda suzuvchi zarralar: chang (mote) yoki cho'g' (ember) */
  ambient: { kind: AmbientKind; count: number };
  /** Bosilganda chiqadigan effekt. distance — avatar o'lchamining % */
  burst: {
    particles: number;
    waves: number;
    distance: number;
    shockwaves: number;
    kinds: ParticleKind[];
    accent: string[];
  };
  sound?: string;
}

export const FRAME_EFFECTS: Record<RankLevel, FrameEffect> = {
  beginner: {
    sparkles: 2, orbiters: 0, shineSeconds: 7, ambient: { kind: "none", count: 0 },
    burst: { particles: 10, waves: 1, distance: 38, shockwaves: 1, kinds: ["dot"], accent: [] },
  },
  bronze: {
    sparkles: 3, orbiters: 0, shineSeconds: 6.5, ambient: { kind: "none", count: 0 },
    burst: { particles: 14, waves: 1, distance: 44, shockwaves: 1, kinds: ["spark", "dot"], accent: ["#FFD3A1"] },
  },
  silver: {
    sparkles: 4, orbiters: 0, shineSeconds: 5.5, ambient: { kind: "none", count: 0 },
    burst: { particles: 18, waves: 1, distance: 48, shockwaves: 1, kinds: ["spark", "star"], accent: ["#FFFFFF"] },
  },
  gold: {
    sparkles: 6, orbiters: 1, shineSeconds: 5, ambient: { kind: "mote", count: 5 },
    burst: { particles: 24, waves: 2, distance: 54, shockwaves: 2, kinds: ["spark", "star", "dot"], accent: ["#FFF0A8", "#FFB800"] },
  },
  platinum: {
    sparkles: 7, orbiters: 1, shineSeconds: 4.5, ambient: { kind: "mote", count: 6 },
    burst: { particles: 26, waves: 2, distance: 56, shockwaves: 2, kinds: ["star", "spark"], accent: ["#FFFFFF", "#B8F1FF"] },
  },
  emerald: {
    sparkles: 8, orbiters: 2, shineSeconds: 4.2, ambient: { kind: "mote", count: 6 },
    burst: { particles: 28, waves: 2, distance: 58, shockwaves: 2, kinds: ["star", "dot", "spark"], accent: ["#8CFFD1", "#00FFA3"] },
  },
  diamond: {
    sparkles: 10, orbiters: 2, shineSeconds: 3.6, ambient: { kind: "mote", count: 8 },
    burst: { particles: 32, waves: 3, distance: 62, shockwaves: 2, kinds: ["star", "spark"], accent: ["#FFFFFF", "#7DE8FF"] },
  },
  master: {
    sparkles: 8, orbiters: 3, shineSeconds: 3.4, ambient: { kind: "mote", count: 9 },
    burst: { particles: 36, waves: 3, distance: 64, shockwaves: 3, kinds: ["star", "dot", "spark"], accent: ["#D8B4FE", "#F0ABFC", "#60A5FA"] },
  },
  grandmaster: {
    sparkles: 10, orbiters: 3, shineSeconds: 3, ambient: { kind: "ember", count: 9 },
    burst: { particles: 42, waves: 3, distance: 68, shockwaves: 3, kinds: ["spark", "star", "ember"], accent: ["#FFC0A8", "#FFD166", "#FF4D4D"] },
    sound: "/sounds/mixkit-fireworks-524.wav",
  },
  immortal: {
    sparkles: 12, orbiters: 4, shineSeconds: 2.8, ambient: { kind: "ember", count: 16 },
    burst: { particles: 52, waves: 4, distance: 74, shockwaves: 4, kinds: ["ember", "spark", "star"], accent: ["#FFE29A", "#FF8A3D", "#FF3D00"] },
    sound: "/sounds/mixkit-multiple-fireworks-explosions-1689.wav",
  },
};
