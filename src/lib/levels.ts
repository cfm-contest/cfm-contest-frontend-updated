// src/lib/levels.ts
// UserStats.Level (backend) bilan mos keladigan UI belgilari.

export type UserLevel = "beginner" | "bronze" | "silver" | "gold" | "pro";

export const LEVEL_LABELS: Record<UserLevel, string> = {
  beginner: "Yangi boshlovchi",
  bronze: "Bronza",
  silver: "Kumush",
  gold: "Oltin",
  pro: "Professional",
};

// 42.uz uslubidagi neytral-oq fon ustida ishlaydigan aksent ranglar
export const LEVEL_BADGE_CLASS: Record<UserLevel, string> = {
  beginner: "bg-neutral-100 text-neutral-600 border-neutral-200",
  bronze: "bg-orange-50 text-orange-700 border-orange-200",
  silver: "bg-slate-100 text-slate-600 border-slate-300",
  gold: "bg-amber-50 text-amber-700 border-amber-300",
  pro: "bg-neutral-900 text-white border-neutral-900",
};

export function levelLabel(level: string): string {
  return LEVEL_LABELS[level as UserLevel] ?? level;
}

export function levelBadgeClass(level: string): string {
  return LEVEL_BADGE_CLASS[level as UserLevel] ?? LEVEL_BADGE_CLASS.beginner;
}

export type CertificateSourceType = "course" | "test" | "contest" | "default";

export const SOURCE_TYPE_LABELS: Record<CertificateSourceType, string> = {
  course: "Kurs",
  test: "Imtihon",
  contest: "Musobaqa",
  default: "Yo'nalish",
};