import { DJANGO_API_ENDPOINT } from "@/config/defaults";
import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Egasi",
  admin: "Admin",
  member: "A'zo",
};

export function initials(name?: string | null) {
  const s = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return s || "?";
}

/** Django `avatar.url` nisbiy ("/media/...") bo'lishi mumkin — to'liq URL qilamiz. */
export function mediaUrl(url: string | null | undefined) {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  try {
    return new URL(DJANGO_API_ENDPOINT).origin + url;
  } catch {
    return url;
  }
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("uz-UZ", { year: "numeric", month: "short", day: "numeric" });
