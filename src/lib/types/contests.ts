type ContestStatus =
  | "upcoming"
  | "ongoing"
  | "ended";

type ContestType =
  | "public"
  | "gym"
  | "private";

type CompactContest = {
  i: number | string;
  t: string;
  s: string;
  y: ContestType;
  st: string;
  et: string;
  d: number;
  p: number | null;
  pc: number;
  r: boolean;
  ss: ContestStatus;
};

type CompactContestResponse = {
  hn: boolean;
  no: number | null;
  rs: CompactContest[];
};


export interface Prize {
  i: number;
  t: string;
  rt: number;
  d: string;
}

export interface VideoData {
  i: string;
  url: string | null;
  thumb: string | null;
  hls: string | null;
  dur: string | null;
}

export interface UserContestStatus {
  r: boolean;
  rs: "in_progress" | "completed" | "expired" | "disqualified" | null;
}

export interface ContestDetail {
  i: number;
  t: string;
  s: string;
  d: string;
  y: "public" | "gym" | "private";
  k: "official" | "gym";
  ct: "icpc" | "dynamic" | "simple";
  ir: boolean;
  st: string;
  et: string;
  rd: string;
  dur: number;
  pm: number;
  pc: number;
  prc: number;
  ss: "upcoming" | "ongoing" | "ended";
  v: VideoData | null;
  u: UserContestStatus;
  prizes: Prize[];
}