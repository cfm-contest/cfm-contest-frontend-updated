// Backend (tasks_api.py) javoblari

export interface ContestOwner {
  full_name: string;
  username: string;
}

export interface ContestProblemData {
  id: number;
  title: string;
  slug: string;
  desc: string;
  dif: string | number;
  xp: number;
  time_l: number;
  memory_l: number;
  cate_name: string | null;
  tags: { id: number; name: string }[];
  langs: { id: number; name: string; version: string }[];
  hints: { id: number; text: string }[];
  chall: { id: number; text: string }[];
  exam: { id: number; input: string; output: string; explanation?: string | null }[];
  func: Record<number, { id: number; code: string }>;
  acceptance: number;
  solved: boolean;
}

export interface ContestQuestionData {
  id: number;
  txt: string;
  instruction?: string | null;
  qtype: string; // SINGLE_CHOICE | MULTIPLE_CHOICE | MATCHING | ARRANGE_WORDS | FILL_BLANKS
  dif: string | number;
  xp: number;
  choices?: { id: number; txt: string }[];
  pairs_left?: { id: number; txt: string; o: number }[];
  pairs_right?: { id: number; txt: string }[];
  items?: { id: number; txt: string }[];
  blanks?: { id: number; pos: number; case: boolean }[];
  exp: string | null;
  vid: string | null;
}

interface TaskBase {
  l: string; // harf
  ms: number; // max ball
  owner: ContestOwner;
}

export type TaskDetail =
  | (TaskBase & { type: "problem"; data: ContestProblemData })
  | (TaskBase & { type: "question"; data: ContestQuestionData });

/** GET /{slug}/tasks — element */
export interface ContestTaskItem {
  id: number;
  l: string;
  s: number; // max ball
  k: "p" | "t";
  t: string; // sarlavha
  o: 0 | 1 | 2; // rasmiy holat
  p: 0 | 1 | 2; // practice holat
  st: boolean; // joriy rejimda yechilgan
  tr: boolean; // joriy rejimda urinilgan
  cl: boolean; // yopiq (test savolga javob berilgan)
  us: number;
  wa: number;
  tm: number | null;
}

export interface ContestTasksResponse {
  title: string;
  ct: string;
  kind: string;
  status: string;
  mode: "contest" | "practice" | string;
  phase: string;
  time_left: number | null;
  can_submit: boolean;
  role: "captain" | "member" | null;
  tasks: ContestTaskItem[];
}
