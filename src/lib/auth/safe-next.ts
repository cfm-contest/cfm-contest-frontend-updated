// src/lib/auth/safe-next.ts
const INVALID = ["/login", "/logout"];

/** Ochiq redirect (//evil.com, /\evil.com) ga yo'l qo'ymaydi. */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  const path = next.split("?")[0].split("#")[0];
  if (INVALID.includes(path)) return fallback;
  return next;
}
