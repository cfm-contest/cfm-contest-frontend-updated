export type Role = "owner" | "admin" | "member";
export type MembershipStatus = "pending" | "active" | "left" | "removed";

export type ListRes<T> = { count: number; results: T[] };
export type Paged<T> = ListRes<T> & { page: number; page_size: number; has_next: boolean };

export type MyTeam = {
  id: string;
  name: string;
  description: string;
  img: string | null;
  is_public: boolean;
  role: Role;
  is_owner: boolean;
  members_count: number;
  created_at: string;
};

export type PublicTeam = {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  owner: string;
  members_count: number;
  my_role: Role | null;
  my_status: MembershipStatus | null;
  created_at: string;
};

export type TeamStats = {
  contests_count: number;
  best_rank: number | null;
};

export type TeamDetail = {
  id: string;
  name: string;
  description: string;
  avatar: string | null;
  owner: {
    id: number;
    telegram_id: number;
    username: string | null;
    full_name: string | null;
  };
  is_public: boolean;
  members_count: number;
  stats: TeamStats;
  my_role: Role | null;
  my_status: MembershipStatus | null;
  /** Backend hisoblaydi. UI shu flag'larga tayanadi (rol matniga emas). */
  is_owner: boolean;
  can_manage: boolean;
  can_invite: boolean;
  can_delete: boolean;
  can_change_roles: boolean;
  can_leave: boolean;
  can_join: boolean;
  /** Faqat can_manage bo'lganda son, aks holda null. */
  pending_requests_count: number | null;
  created_at: string;
  updated_at: string;
};

export type Member = {
  user_id: number;
  telegram_id: number;
  username: string | null;
  full_name: string | null;
  role: Role;
  is_owner: boolean;
  is_admin: boolean;
  is_me: boolean;
  joined_at: string | null;
};

export type Invitation = {
  id: string;
  team_id: string;
  team_name: string;
  team_avatar: string | null;
  invited_by: string;
  created_at: string;
  expires_at: string | null;
};

/** Jamoa nomidan yuborilgan, hali javob berilmagan taklif. */
export type SentInvitation = {
  id: string;
  invited_user: {
    telegram_id: number;
    username: string | null;
    full_name: string | null;
  };
  invited_by: string;
  created_at: string;
  expires_at: string | null;
};

/** Yopiq jamoaga qo'shilish so'rovi. */
export type JoinRequest = {
  id: number;
  telegram_id: number;
  username: string | null;
  full_name: string | null;
  requested_at: string;
};

/** User qidiruv natijasi. `state` bo'lmasa — "available" deb olinadi. */
export type SearchUser = {
  telegram_id: number;
  username: string | null;
  full_name: string | null;
  state?: "available" | "member" | "invited" | "requested";
};

// ---------- Jamoaviy contestlar ----------

export type ContestStatus = "upcoming" | "ongoing" | "ended";
export type RegistrationStatus = "in_progress" | "completed" | "expired" | "disqualified";

export type TeamContestRow = {
  registration_id: string;
  contest: {
    id: number;
    slug: string;
    title: string;
    kind: "official" | "gym";
    visibility: "public" | "private";
    contest_type: "icpc" | "dynamic" | "simple";
    participation_mode: "FIXED" | "INDIVIDUAL";
    start_time: string | null;
    end_time: string | null;
    status: ContestStatus;
  };
  status: RegistrationStatus;
  rank: number | null;
  score: number;
  penalty_minutes: number;
  solved_count: number;
  problems_count: number;
  registered_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

/** /teams/my-contests qatorida jamoa ham keladi. */
export type MyTeamContestRow = TeamContestRow & {
  team: { id: string; name: string; avatar: string | null };
};

export type TeamContestsRes = Paged<TeamContestRow> & {
  team_id: string;
  summary: TeamStats;
};

export type MyTeamContestsRes = Paged<MyTeamContestRow>;
