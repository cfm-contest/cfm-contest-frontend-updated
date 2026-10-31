import type { RankLevel } from "./types";

export const RANK_CONFIG = {
  beginner: {
    label: "Yangi boshlovchi",
    primary: "#9CA3AF",
    secondary: "#E5E7EB",
    glow: "rgba(156, 163, 175, 0.22)",
    shape: "simple",
  },
  bronze: {
    label: "Bronza",
    primary: "#B87333",
    secondary: "#F0B27A",
    glow: "rgba(184, 115, 51, 0.3)",
    shape: "metal",
  },
  silver: {
    label: "Kumush",
    primary: "#A8B4C2",
    secondary: "#F8FAFC",
    glow: "rgba(192, 205, 220, 0.3)",
    shape: "metal",
  },
  gold: {
    label: "Oltin",
    primary: "#D9A441",
    secondary: "#FFF0A8",
    glow: "rgba(245, 185, 66, 0.36)",
    shape: "crown",
  },
  platinum: {
    label: "Platina",
    primary: "#83C9E8",
    secondary: "#E4FAFF",
    glow: "rgba(91, 204, 245, 0.34)",
    shape: "crystal",
  },
  emerald: {
    label: "Zumrad",
    primary: "#10A878",
    secondary: "#8CFFD1",
    glow: "rgba(16, 168, 120, 0.35)",
    shape: "crystal",
  },
  diamond: {
    label: "Olmos",
    primary: "#48BFEF",
    secondary: "#E0FBFF",
    glow: "rgba(72, 191, 239, 0.4)",
    shape: "spikes",
  },
  master: {
    label: "Master",
    primary: "#8B5CF6",
    secondary: "#D8B4FE",
    glow: "rgba(139, 92, 246, 0.4)",
    shape: "arcane",
  },
  grandmaster: {
    label: "Grandmaster",
    primary: "#E34B4B",
    secondary: "#FFC0A8",
    glow: "rgba(227, 75, 75, 0.42)",
    shape: "crown",
  },
  immortal: {
    label: "Immortal",
    primary: "#FF6A32",
    secondary: "#FFE29A",
    glow: "rgba(255, 106, 50, 0.48)",
    shape: "flame",
  },
} satisfies Record<
  RankLevel,
  {
    label: string;
    primary: string;
    secondary: string;
    glow: string;
    shape: string;
  }
>;
