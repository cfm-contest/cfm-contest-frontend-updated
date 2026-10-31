// lib/social.ts — ijtimoiy tarmoqlar uchun yagona manba (settings + profil sahifasi)
import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin, FaTelegram, FaYoutube } from "react-icons/fa6";
import { SiCodeforces, SiLeetcode } from "react-icons/si";
import { AtCoderIcon } from "@/components/icons/atcoder-icon";

export type SocialKey =
  | "telegram"
  | "github"
  | "linkedin"
  | "youtube"
  | "codeforces"
  | "leetcode"
  | "atcoder";

export interface SocialMeta {
  key: SocialKey;
  label: string;
  icon: IconType;
  /** Brend rangi (oq fonda) */
  color: string;
  /** Qora fonda o'qilishi qiyin ranglar uchun (GitHub, AtCoder) */
  onDark?: string;
  /** Faqat ko'rsatish uchun: havola boshi */
  prefix: string;
  placeholder: string;
  build: (handle: string) => string;
}

const enc = encodeURIComponent;
const isUrl = (v: string) => /^https?:\/\//i.test(v);
const bare = (v: string) => v.replace(/^@+/, "");

export const SOCIALS: SocialMeta[] = [
  {
    key: "telegram",
    label: "Telegram",
    icon: FaTelegram,
    color: "#26A5E4",
    prefix: "t.me/",
    placeholder: "username",
    build: (v) => `https://t.me/${enc(v)}`,
  },
  {
    key: "github",
    label: "GitHub",
    icon: FaGithub,
    color: "#181717",
    onDark: "#E6EDF3",
    prefix: "github.com/",
    placeholder: "username",
    build: (v) => `https://github.com/${enc(v)}`,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: FaLinkedin,
    color: "#0A66C2",
    onDark: "#3B9AE8",
    prefix: "linkedin.com/in/",
    placeholder: "username",
    build: (v) => `https://www.linkedin.com/in/${enc(v)}`,
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: FaYoutube,
    color: "#FF0000",
    onDark: "#FF4B4B",
    prefix: "youtube.com/@",
    placeholder: "kanal",
    build: (v) => `https://www.youtube.com/@${enc(v)}`,
  },
  {
    key: "codeforces",
    label: "Codeforces",
    icon: SiCodeforces,
    color: "#1F8ACB",
    prefix: "codeforces.com/profile/",
    placeholder: "handle",
    build: (v) => `https://codeforces.com/profile/${enc(v)}`,
  },
  {
    key: "leetcode",
    label: "LeetCode",
    icon: SiLeetcode,
    color: "#FFA116",
    prefix: "leetcode.com/u/",
    placeholder: "username",
    build: (v) => `https://leetcode.com/u/${enc(v)}`,
  },
  {
    key: "atcoder",
    label: "AtCoder",
    icon: AtCoderIcon as unknown as IconType,
    color: "#222222",
    onDark: "#E5E7EB",
    prefix: "atcoder.jp/users/",
    placeholder: "username",
    build: (v) => `https://atcoder.jp/users/${enc(v)}`,
  },
];

/** Faqat http(s) havolalar o'tadi. */
export function safeHttpUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Qiymat (nik yoki havola) -> xavfsiz https havola, yoki null. */
export function socialHref(meta: SocialMeta, value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  return safeHttpUrl(isUrl(v) ? v : meta.build(bare(v)));
}

/** Veb-sayt: sxema yo'q bo'lsa https qo'shiladi (backend bilan bir xil qoida). */
export function normalizeWebsite(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const url = safeHttpUrl(v.includes("://") ? v : `https://${v}`);
  if (!url) return null;
  return new URL(url).hostname.includes(".") ? url : null;
}
