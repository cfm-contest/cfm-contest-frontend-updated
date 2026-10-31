// lib/api/contests/contests.ts
import { backendRequest } from "@/lib/api/django/backend";

//
// Contest API: type'lar + BRAUZER (client component) uchun fetch funksiyalari.
// Server component'larda `ApiProxy` ishlatiladi (bu faylni ham import qilsa bo'ladi —
// u yerda faqat type'lar kerak).
//

// =========================================================
// TYPE'LAR
// =========================================================

export type ContestType = "public" | "gym" | "private";
export type ContestStatus = "upcoming" | "ongoing" | "ended";
export type ContestKind = "official" | "gym";
export type ContestVisibility = "public" | "private";
export type ScoringType = "icpc" | "dynamic" | "simple";
/** Backend katta harf qaytaradi: "FIXED" (hamma bir vaqtda) | "INDIVIDUAL" (Start bosilganda). */
export type ParticipationMode = "FIXED" | "INDIVIDUAL";

export const isIndividual = (mode: string | null | undefined) =>
  (mode ?? "").toUpperCase() === "INDIVIDUAL";
export type AccessMode = "contest" | "practice" | "denied";
export type AccessPhase =
  | "upcoming"
  | "open"
  | "ready"
  | "running"
  | "finished"
  | "ended"
  | "disqualified"
  | "gym"
  | "practice";
export type RegistrationStatus = "in_progress" | "completed" | "disqualified";

// ---------- Ro'yxat ----------

export interface CompactContest {
  i: number; // id
  t: string; // title
  s: string; // slug
  y: ContestType;
  ct: ScoringType;
  pmode: ParticipationMode;
  ir: boolean; // is_rated
  st: string; // start (ISO)
  et: string; // end (ISO)
  d: number; // davomiylik (daqiqa)
  p: number | null; // masalalar soni (boshlanmagan bo'lsa null)
  pc: number; // ishtirokchilar
  r: boolean; // ro'yxatdan o'tganmi
  ss: ContestStatus;
  vis: ContestVisibility;
  pt: "solo" | "team";
  pm: ParticipationMode;
}

export interface CompactContestResponse {
  hn: boolean; // keyingi sahifa bormi
  no: number | null; // keyingi offset
  sn: string; // server vaqti (ISO)
  rs: CompactContest[];
}

export interface ContestListParams {
  limit?: number;
  offset?: number;
  type?: ContestType;
  status?: ContestStatus;
  search?: string;
}

// ---------- Detail ----------

export interface ContestIntroVideo {
  i: string;
  u: string | null;
  th: string | null;
  d: string | null; // davomiylik, masalan "02:24"
}

export interface ContestUserState {
  r: true;
  rs: RegistrationStatus | null;
  sa: string | null; // started_at
  ca: string | null; // completed_at
  sc: number; // ball
  pn: number; // jarima (daqiqa)
  rk: number | null; // o'rin
  ok: number; // to'g'ri
  wr: number; // xato
  ts: number; // sarflangan vaqt (soniya)
  xp: number | null;
  rb: number | null; // boshlang'ich reyting
  rd: number | null; // reyting o'zgarishi
  dq: string | null; // diskvalifikatsiya sababi
}

export interface ContestTask {
  id: number;
  l: string; // harf
  s: number; // max ball
  k: "p" | "t"; // p = kod masala, t = test savol
  slug?: string; // k === "p"
  q?: number; // k === "t"
  t: string;
  o: 0 | 1 | 2; // rasmiy holat
  p: 0 | 1 | 2; // practice holat
  st: boolean; // joriy rejimda yechilgan
  tr: boolean; // joriy rejimda urinilgan, yechilmagan
  cl: boolean; // yopiq (test savolga javob berilgan)
  us: number; // rasmiy ball
  wa: number; // rasmiy xato urinishlar
  tm: number | null; // yechilgan vaqt (soniya)
}

export interface ContestDetail {
  i: number;
  t: string;
  s: string;
  ss: ContestStatus;
  k: ContestKind;
  vis: ContestVisibility;
  pm: ParticipationMode;
  ct: ScoringType;
  ta: boolean; // masalalarni ko'rish mumkinmi
  m: AccessMode;
  ph: AccessPhase;
  can: boolean; // yechim yuborish mumkinmi
  sn: string; // server vaqti
  et: string; // foydalanuvchi uchun tugash vaqti
  tl: number; // qolgan soniya (faqat contest rejimida)
  v: ContestIntroVideo | null;
  u: ContestUserState | null;
  ps: ContestTask[];

  // --- Backend'ga qo'shilsa UI avtomatik ishlatadi (hozircha ixtiyoriy) ---
  d?: string | null; // tavsif
  st?: string; // contest boshlanishi
  ce?: string; // contest tugashi
  dur?: number; // davomiylik (daqiqa)
  pc?: number; // ishtirokchilar soni
  ir?: boolean; // reytingli
  pt: "solo" | "team";
}

// ---------- Standings ----------

export interface StandingProblemCell {
  s: boolean; // yechilgan
  sc: number;
  at: number; // urinishlar
  wa: number; // xato urinishlar
  t: number | null; // soniya
}

export interface StandingRow {
  n: number;
  i: number;
  u: string | null;
  fn: string | null;
  a: string | null;
  sc: number;
  pen: number | null; // faqat ICPC
  sv: number; // yechilganlar soni
  rs: RegistrationStatus;
  ps: Record<string, StandingProblemCell>;
}

export interface StandingsResponse {
  ct: ScoringType;
  cols: string[];
  hn: boolean;
  no: number | null;
  rs: StandingRow[];
}

// ---------- Submissions ----------

export interface SubmissionRow {
  i: number;
  ui: number;
  u: string | null;
  fn: string | null;
  l: string | null; // masala harfi
  pt: string; // masala nomi
  ps: string; // masala slug
  lg: string; // til
  v: string; // verdict
  pc: number; // o'tgan testlar
  tc: number; // jami testlar
  t: number | null; // vaqt
  m: number | null; // xotira
  at: string;
}

export interface SubmissionsResponse {
  hn: boolean;
  no: number | null; // keyingi cursor
  rs: SubmissionRow[];
}

export interface SubmissionsParams {
  limit?: number;
  cursor?: number;
  mine?: boolean;
  problem?: string;
}

// ---------- Participants ----------

export interface ParticipantRow {
  n: number;
  i: number;
  u: string | null;
  fn: string | null;
  a: string | null;
  lv: string;
  xp: number;
}

export interface ParticipantsResponse {
  hn: boolean;
  no: number | null;
  rs: ParticipantRow[];
}

export interface PagedParams {
  limit?: number;
  offset?: number;
  search?: string;
}

// ---------- Amallar ----------

export interface ActionResponse {
  reg?: boolean;
  ok?: boolean;
  mes?: string;
  message?: string;
}

// =========================================================
// LABEL'LAR (UI uchun)
// =========================================================

export const SCORING_LABEL: Record<ScoringType, string> = {
  icpc: "ICPC",
  dynamic: "Dynamic",
  simple: "Simple",
};

export const SCORING_HINT: Record<ScoringType, string> = {
  icpc: "Yechilgan masalalar soni, keyin jarima daqiqalari bo'yicha",
  dynamic: "Ball masala yechilish vaqtiga qarab kamayadi",
  simple: "Har bir masala uchun belgilangan ball",
};

export const STATUS_LABEL: Record<ContestStatus, string> = {
  upcoming: "Kutilmoqda",
  ongoing: "Davom etmoqda",
  ended: "Yakunlangan",
};

export type PhaseTone = "info" | "success" | "warning" | "danger";

export const PHASE_INFO: Record<AccessPhase, { tone: PhaseTone; text: string }> = {
  upcoming: { tone: "info", text: "Musobaqa hali boshlanmagan. Masalalar boshlanganda ochiladi." },
  open: { tone: "warning", text: "Masalalarni ko'rish uchun avval ro'yxatdan o'ting." },
  ready: { tone: "warning", text: "Vaqtingiz «Start» tugmasini bosganingizda boshlanadi." },
  running: { tone: "success", text: "Musobaqa davom etmoqda. Omad!" },
  finished: {
    tone: "info",
    text: "Ishtirokingiz yakunlangan. Masalalar musobaqa tugagach ochiladi.",
  },
  ended: { tone: "info", text: "Musobaqa tugagan va mashq rejimi yopiq (yoki siz qatnashmagansiz)." },
  disqualified: { tone: "danger", text: "Siz diskvalifikatsiya qilingansiz." },
  gym: { tone: "info", text: "Mashg'ulot rejimi: natijalar reytingga yozilmaydi." },
  practice: {
    tone: "info",
    text: "Musobaqa tugagan. Mashq rejimida yechishingiz mumkin, natijalar reytingga ta'sir qilmaydi.",
  },
};

// =========================================================
// FETCH YADROSI
// =========================================================

const BASE = "/api/contests";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Backend xato formatlari: {detail: str | [{msg}]}, {mes}, {message}. */
function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as Record<string, unknown>;
  if (typeof b.detail === "string") return b.detail;
  if (Array.isArray(b.detail) && b.detail[0] && typeof b.detail[0] === "object") {
    const msg = (b.detail[0] as Record<string, unknown>).msg;
    if (typeof msg === "string") return msg;
  }
  if (typeof b.mes === "string") return b.mes;
  if (typeof b.message === "string") return b.message;
  return fallback;
}

type Primitive = string | number | boolean | null | undefined;

function toQuery(params: Record<string, Primitive>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function request<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await backendRequest(`${BASE}${path}`, {
      method: init.method ?? "GET",
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: init.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "Serverga ulanib bo'lmadi. Internetni tekshiring.");
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(body, `Xatolik yuz berdi (${res.status})`), body);
  }
  return body as T;
}

// =========================================================
// FETCH FUNKSIYALAR
// =========================================================

export function getContests(params: ContestListParams = {}, signal?: AbortSignal) {
  return request<CompactContestResponse>(
    `/${toQuery({
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
      type: params.type ?? "public",
      status: params.status,
      search: params.search,
    })}`,
    { signal },
  );
}

export function getContestDetail(slug: string, signal?: AbortSignal) {
  return request<ContestDetail>(`/${encodeURIComponent(slug)}`, { signal });
}

export function getStandings(slug: string, params: PagedParams = {}, signal?: AbortSignal) {
  return request<StandingsResponse>(
    `/${encodeURIComponent(slug)}/standings${toQuery({
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      search: params.search,
    })}`,
    { signal },
  );
}

export function getParticipants(slug: string, params: PagedParams = {}, signal?: AbortSignal) {
  return request<ParticipantsResponse>(
    `/${encodeURIComponent(slug)}/users${toQuery({
      limit: params.limit ?? 30,
      offset: params.offset ?? 0,
      search: params.search,
    })}`,
    { signal },
  );
}

export function getSubmissions(
  slug: string,
  params: SubmissionsParams = {},
  signal?: AbortSignal,
) {
  return request<SubmissionsResponse>(
    `/${encodeURIComponent(slug)}/submissions${toQuery({
      limit: params.limit ?? 30,
      cursor: params.cursor,
      mine: params.mine,
      problem: params.problem,
    })}`,
    { signal },
  );
}

export function registerForContest(slug: string, key?: string) {
  return request<ActionResponse>(`/register/${encodeURIComponent(slug)}`, {
    method: "POST",
    body: key ? { key } : {},
  });
}

export function startContest(slug: string) {
  return request<ActionResponse>(`/${encodeURIComponent(slug)}/start`, { method: "POST" });
}

export function finishContest(slug: string) {
  return request<ActionResponse>(`/${encodeURIComponent(slug)}/finish`, { method: "POST" });
}
