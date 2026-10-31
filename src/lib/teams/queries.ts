import ApiProxy from "@/lib/api/django/backend.server";
import { TEAMS_API } from "./server";
import type {
  Invitation,
  JoinRequest,
  ListRes,
  Member,
  MyTeam,
  MyTeamContestsRes,
  Paged,
  PublicTeam,
  SentInvitation,
  TeamContestsRes,
  TeamDetail,
} from "./types";

// Server componentlar uchun (to'g'ridan-to'g'ri Django'ga, cookie'dan token bilan).
const auth = { withAuth: true } as const;

type Params = Record<string, string | number | undefined>;

/** { a: 1, b: undefined } -> "?a=1" (bo'sh qiymatlar tashlab yuboriladi). */
function qs(params?: Params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const getMyTeams = () => ApiProxy.get<ListRes<MyTeam>>(`${TEAMS_API}/`, auth);

export const getPublicTeams = (params?: { q?: string; page?: number; page_size?: number }) =>
  ApiProxy.get<Paged<PublicTeam>>(`${TEAMS_API}/public${qs(params)}`, auth);

export const getInvitations = () => ApiProxy.get<ListRes<Invitation>>(`${TEAMS_API}/team-invitations`, auth);
export const getTeam = (id: string) => ApiProxy.get<TeamDetail>(`${TEAMS_API}/${id}`, auth);
export const getMembers = (id: string) =>
  ApiProxy.get<{ team_id: string; count: number; members: Member[] }>(`${TEAMS_API}/${id}/members`, auth);

export const getTeamInvitations = (id: string) =>
  ApiProxy.get<ListRes<SentInvitation>>(`${TEAMS_API}/${id}/invitations`, auth);

export const getJoinRequests = (id: string) =>
  ApiProxy.get<ListRes<JoinRequest>>(`${TEAMS_API}/${id}/join-requests`, auth);

type ContestParams = { status?: "upcoming" | "ongoing" | "ended"; page?: number; page_size?: number };

export const getTeamContests = (id: string, params?: ContestParams) =>
  ApiProxy.get<TeamContestsRes>(`${TEAMS_API}/${id}/contests${qs(params)}`, auth);

export const getMyTeamContests = (params?: ContestParams) =>
  ApiProxy.get<MyTeamContestsRes>(`${TEAMS_API}/my-contests${qs(params)}`, auth);
