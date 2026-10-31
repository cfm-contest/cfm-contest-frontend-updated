import { backendRequest } from "@/lib/api/django/backend";
import type { ContestDetail } from "@/lib/api/contests/contests";

// =========================================================
// Backend (contests/api/access.py) yangi kalitlari
// =========================================================
export interface ContestPerms {
  reg: boolean; team: boolean; rr: string | null; key: boolean;
  st: boolean; fin: boolean; leave: boolean;
  vp: boolean; sub: boolean; rec: boolean; pr: boolean;
  lb: boolean; pl: boolean;
  role: "captain" | "member" | null; cap: boolean; own: boolean; edit: boolean;
}

export type NextAction =
  | "login" | "register" | "register_key" | "register_team" | "closed"
  | "wait" | "wait_captain" | "start" | "solve" | "practice" | "view_results" | "disqualified";

export interface ContestTimeline {
  st: string | null; et: string | null; rd: string | null; ud: string | null;
  d: number; tts: number | null; tte: number | null; ttr: number | null; tl: number;
}

export interface TeamMember { i: number; u: string | null; fn: string | null; c?: boolean; busy?: boolean }
export type TeamWhy = "already_registered" | "captain_busy" | "too_small";
/** teams.py eligible_teams(): kapitan bo'lgan jamoalarim. Team.id — UUID (string). */
export interface TeamOption {
  i: string; n: string; size: number; free: number; ok: boolean; why: TeamWhy | null;
  conflicts: number[]; members: TeamMember[];
}
export interface TeamBlock {
  min: number; max: number; role: "captain" | "member" | null;
  my: { i: string; n: string; mc: number; members?: TeamMember[] } | null;
  teams: TeamOption[];
}

export interface ContestExtras {
  tm: ContestTimeline;
  perm: ContestPerms;
  na: NextAction;
  cnt: { p: number | null; ts: number | null; pc: number; pz: number };
  pz: { r: number; t: string; d: string | null }[];
  lg: { i: number; n: string }[];
  rt: { ir: boolean; pk: number | null; rb: number | null; rd: number | null };
  team: TeamBlock | null;
}
export type ContestFull = Omit<ContestDetail, keyof ContestExtras> & ContestExtras;

// =========================================================
// So'rov qatlami (xato kodi + extra saqlanadi)
// =========================================================
export class ContestActionError extends Error {
  constructor(
    message: string,
    public code = "unknown_error",
    public status?: number,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const enc = encodeURIComponent;

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await backendRequest(`/api/contests${path}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new ContestActionError(
      res.ok ? "Server noto'g'ri javob qaytardi." : text.slice(0, 200) || `HTTP ${res.status}`,
      res.ok ? "invalid_response" : "http_error",
      res.status,
    );
  }
  if (!res.ok) {
    // /start eski shakli: {reg, mes, code}; qolganlari: {detail, extra:{code}}
    throw new ContestActionError(
      body?.detail ?? body?.mes ?? `HTTP xatosi: ${res.status}`,
      body?.extra?.code ?? body?.code ?? "http_error",
      res.status,
      body?.extra ?? {},
    );
  }
  return body as T;
}

export interface ActionResult { mes?: string; message?: string; ok?: boolean; reg?: boolean }

export const fetchContest = (slug: string) => call<ContestFull>(`/${enc(slug)}`);

export const registerSolo = (slug: string, key?: string) =>
  call<ActionResult>(`/register/${enc(slug)}`, { method: "POST", body: JSON.stringify({ key: key ?? null }) });

export const registerTeam = (slug: string, body: { team_id: string; member_ids: number[] | null; key?: string }) =>
  call<ActionResult>(`/register/${enc(slug)}/team`, {
    method: "POST",
    body: JSON.stringify({ team_id: body.team_id, member_ids: body.member_ids, key: body.key ?? null }),
  });

export const startContest = (slug: string) => call<ActionResult>(`/${enc(slug)}/start`, { method: "POST" });
export const finishContest = (slug: string) => call<ActionResult>(`/${enc(slug)}/finish`, { method: "POST" });
export const leaveContest = (slug: string) => call<ActionResult>(`/${enc(slug)}/register`, { method: "DELETE" });

export interface IntegrityDelta { tab_switches?: number; away_seconds?: number; copies?: number; pastes?: number }

/** Page lifecycle events use fetch keepalive so the API cookie is included. */
export async function sendIntegrity(slug: string, delta: IntegrityDelta, keepalive = false): Promise<void> {
  const payload = JSON.stringify(delta);
  await call(`/${enc(slug)}/activity`, {
    method: "POST",
    body: payload,
    keepalive,
  });
}
