import type { Difficulty } from "./types";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "O'son",
  medium: "O'rta",
  hard: "Qiyin",
};

export const DIFFICULTY_CLASSES: Record<Difficulty, string> = {
  easy: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  hard: "bg-rose-50 text-rose-600 border border-rose-200",
};

export function formatMemory(val: number | "-"): string {
  if (val === "-") return "—";
  const mb = Number(val) / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatTime(val: number | "-"): string {
  if (val === "-") return "—";
  return `${val} ms`;
}

export function formatDateTime(dt: string): string {
  const [d, t] = dt.split(" ");
  if (!d || !t) return dt;
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y} ${t}`;
}

export function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export function fromBase64(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}