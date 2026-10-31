// ============================================================
// COMMON
// ============================================================

export type Difficulty = "easy" | "medium" | "hard";

export type Reaction = "like" | "dislike" | null;

export type LikeAction = "created" | "updated" | "deleted";


// ============================================================
// API ERROR
// ============================================================

export interface ApiErrorResponse {
  detail: string;

  extra?: {
    code?: string;
    [key: string]: unknown;
  };
}


// ============================================================
// QUERY PARAMS
// ============================================================

export interface ProblemsSearchParams {
  limit?: number;
  offset?: number;
  search?: string;
  category_id?: number | string;
  tag_id?: number | string;
  difficulty?: Difficulty | "";
  published_date?: string; // YYYY-MM-DD
  from_date?: string;      // YYYY-MM-DD
  to_date?: string;        // YYYY-MM-DD
}

export interface NavigationParams {
  direction: "next" | "prev";
}


// ============================================================
// CATEGORY / TAG
// Backend: /problems/categories/ -> {id, name, slug}[]
//          /problems/tags/       -> {id, name}[]
// ============================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Tag {
  id: number;
  name: string;
}


// ============================================================
// LANGUAGE
// ============================================================

export interface Language {
  id: number;
  name: string;
  version: string;
}


// ============================================================
// RAW REFS (backend qisqartirilgan formatlari)
// ============================================================

export interface RawCategoryRef {
  id: number;
  t: string;
}

export interface RawTagRef {
  id: number;
  t: string;
}

export interface RawLangItem {
  id: number;
  t: string;
  v: string;
}


// ============================================================
// HINT
// ============================================================

export interface Hint {
  id: number;
  text: string;
}

export interface RawHintItem {
  id: number;
  txt: string;
}


// ============================================================
// CHALLENGE
// ============================================================

export interface Challenge {
  id: number;
  text: string;
}

export interface RawChallengeItem {
  id: number;
  txt: string;
}


// ============================================================
// SAMPLE TEST
// ============================================================

export interface TestCase {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

export interface RawTestCaseItem {
  id: number;
  in: string;
  out: string;
  exp: string | null;
}


// ============================================================
// STARTER CODE
// ============================================================

export interface StarterCode {
  id: number;
  code: string;
}

export interface RawFunctionItem {
  id: number;
  fn: string;
  lid: number;
}


// ============================================================
// PROBLEMS LIST — RAW  (backend: GET /problems/)
// ============================================================

export interface RawProblemListItem {
  id: number;
  t: string;
  s: string;
  dif: Difficulty;
  xp: number;

  cat: RawCategoryRef | null;

  tags: RawTagRef[];

  published_at: string;

  prem: boolean;

  acc: number;

  access: boolean;

  done: boolean;
}

export interface RawProblemsListResponse {
  count: number;
  limit: number;
  offset: number;
  data: RawProblemListItem[];
}


// ============================================================
// PROBLEMS LIST — FRONTEND
// ============================================================

export interface Problems {
  id: number;
  slug: string;
  title: string;
  difficulty: Difficulty;
  xp: number;
  acceptance: number;
  category: string | null;
  tags: string[];
  solved: boolean;
  premium: boolean;
  hasAccess: boolean;
  publishedAt: string;
}

export interface ProblemsResponse {
  count: number;
  limit: number;
  offset: number;
  data: Problems[];
}


// ============================================================
// RAW PROBLEM DETAIL — BASE  (backend: GET /problems/{slug}/)
// ============================================================

export interface RawProblemDetailBase {
  id: number;
  t: string;
  s: string;
  dif: Difficulty;
  xp: number;
  tl: number;
  ml: number;
  cat: RawCategoryRef | null;
  tags: RawTagRef[];
  prem: boolean;
  published_at: string;
  done: boolean;

  // NEW: Audio, Likes va Bookmark xususiyatlari
  audio: string | null;
  likes: number;
  is_liked: boolean;
  is_bookmarked: boolean;
}

// access: true bo'lganda backend desc/langs/hints/challs/tests/funcs beradi.
export interface RawProblemDetailUnlocked extends RawProblemDetailBase {
  access: true;
  desc: string;
  langs: RawLangItem[];
  hints: RawHintItem[];
  challs: RawChallengeItem[];
  tests: RawTestCaseItem[];
  funcs: Record<string, RawFunctionItem>;
}

// access: false bo'lganda backend faqat asosiy (locked) maydonlarni beradi.
export interface RawProblemDetailLocked extends RawProblemDetailBase {
  access: false;
}

export type RawProblemDetail =
  | RawProblemDetailUnlocked
  | RawProblemDetailLocked;


// ============================================================
// PROBLEM DETAIL — FRONTEND
// ============================================================

export interface ProblemDetailBase {
  id: number;
  title: string;
  slug: string;
  difficulty: Difficulty;
  xp: number;
  timeLimit: number;
  memoryLimit: number;
  category: string | null;
  tags: Tag[];
  premium: boolean;
  hasAccess: boolean;
  solved: boolean;
  publishedAt: string;

  // NEW: Frontend interfeys xususiyatlari
  audio: string | null;
  likesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

export interface ProblemDetailUnlocked extends ProblemDetailBase {
  hasAccess: true;
  desc: string;
  languages: Language[];
  hints: Hint[];
  challenges: Challenge[];
  sampleTests: TestCase[];
  starterCode: Record<number, StarterCode>;
}

export interface ProblemDetailLocked extends ProblemDetailBase {
  hasAccess: false;
}

export type ProblemDetail = ProblemDetailUnlocked | ProblemDetailLocked;


// ============================================================
// LIKE & BOOKMARK RESPONSES
// ============================================================

export interface ToggleLikeResponse {
  success: boolean;
  is_liked: boolean;
  likes_count: number;
}

export interface ToggleBookmarkResponse {
  success: boolean;
  is_bookmarked: boolean;
}


// ============================================================
// NAVIGATION
// Backend: GET /problems/{slug}/navigation/?direction=prev|next
// ============================================================

export interface AdjacentProblem {
  slug: string;
  title: string;
}


// ============================================================
// RANDOM
// ============================================================

export interface RandomProblem {
  slug: string;
  title: string;
}


// ============================================================
// STATS  (backend: GET /problems/stats/)
// ============================================================

export interface DifficultyStat {
  total: number;
  solved: number;
}

export interface ProblemStats {
  total: number;
  solved: number;
  by_difficulty: {
    easy: DifficultyStat;
    medium: DifficultyStat;
    hard: DifficultyStat;
  };
}


// ============================================================
// SOLUTION VIDEO  (backend: GET /problems/{slug}/hls/video/)
// ============================================================

export interface SolutionVideoResponse {
  id: string;
  hls_url: string;
  thumbnail: string | null;
  duration: number | null;
}


// ============================================================
// CODE EXECUTION (Run) & SUBMISSION (Submit)
// ============================================================

export interface RunCodePayload {
  problem_id: number;
  language_id: number;
  code: string;   // base64
  stdin?: string;
}

export interface RunResultItem {
  index: number;
  status: string;
  cpu_time?: number | null;
  memory?: number | null;
  input: string;
  expected_output: string;
  output: string;
  message?: string | null;
}

export type RunResponse =
  | { status: "success"; results: RunResultItem[] }
  | { status: "error"; message: string }
  | { status: "input_required"; partial_output?: string };

export interface SubmitCodePayload {
  problem_id: number;
  language_id: number;
  code: string; // base64
}

export interface SubmitCodeResult {
  t?: string;
}