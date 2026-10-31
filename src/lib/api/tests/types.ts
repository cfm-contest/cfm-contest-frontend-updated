// lib/api/tests/types.ts
import type { TestItem } from "./tests";

/** Detail endpoint: /tests/{slug} */
export interface TestDetailData extends TestItem {
  desc: string | null;
  code: boolean; // kirish kodi kerakmi
  enr: boolean; // TestEnrollment bor
  ss: "in_progress" | "completed" | "expired" | null; // sessiya holati
  stats: unknown | null;
  qn: number; // savollar soni
  pn: number; // qatnashganlar (sessiya boshlaganlar)
  en: number; // ro'yxatdan o'tganlar
}

export interface TestDetailPayload {
  item: TestDetailData;
}

/** /tests/{slug}/liaderbar */
export interface LeaderboardItem {
  rank: number;
  uid: string;
  user: string;
  ball: string;
  grade: string;
  correct: number;
  wrong: number;
}

export interface LeaderboardResponse {
  items: LeaderboardItem[];
  hn: boolean;
  no: number | null;
  me: LeaderboardItem | null;
}

/** /tests/{slug}/result (build_result) */
export interface TestResultResponse {
  t: string;
  slug: string;
  ts: "upcoming" | "ongoing" | "finished";
  start: string;
  end: string;
  ss: string;
  sa: string;
  ca: string | null;
  a: { n: number; c: number; w: number; u: number };
  r: null | {
    ball: number;
    g: string;
    st: {
      pub: string;
      n: number;
      q: number;
      avg: number | null;
      med: number | null;
      std: number | null;
      ac: number | null;
      gr: Record<string, number>;
    };
  };
}

/** /tests/{slug}/question */
export interface TaskListResponse {
  title: string;
  slug: string;
  left: number;
  d: { id: number; type: string }[];
  a: number[];
}

/** /tests/{slug}/tasks/{id} */
export interface TaskData {
  id: number;
  txt: string;
  ins: string | null;
  qtype: string;
  xp: number;
  choices?: { id: number; txt: string }[];
  pairs_left?: { id: number; txt: string }[];
  pairs_right?: { id: number; txt: string }[];
  items?: { id: number; txt: string }[];
  blanks?: { id: number; pos: number; case: boolean }[];
}

/** Ball shkalasi (Rasch ball maksimumi). Boshqacha bo'lsa shu yerda o'zgartiring. */
export const MAX_BALL = 100;
