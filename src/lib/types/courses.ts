// ==========================================================
// 1. BACKEND RAW API RESPONSES (Backend'dan keladigan asl JSON)
// ==========================================================

export interface RawVideo {
  hls?: string | null;
  img?: string | null;
  dur?: number | null;
}

export interface RawUserStatus {
  done?: boolean;
  ft?: number; // finished_tasks
}

export interface RawModuleStatus {
  done?: boolean;
  cl?: number; // completed_lessons
  ct?: number; // completed_tests
}

export interface RawLesson {
  id: number;
  t: string;    // title
  s: string;    // slug
  o: number;    // order
  tk?: number;  // total_tasks
  locked?: boolean;
  us?: RawUserStatus | null;
}

export interface RawTestResult {
  attempted?: boolean;
  score_pct?: number | null;
  passed?: boolean | null;
}

export interface RawModuleTest {
  id: number;
  t: string;        // title
  s: string;        // slug
  dur?: number;     // duration
  min_pct?: number; // min_pass_percentage
  result?: RawTestResult | null;
}

export interface RawModule {
  id: number;
  t: string;        // title
  s: string;        // slug
  o: number;        // order
  tl?: number;      // total_lessons
  tt?: number;      // total_tests
  locked?: boolean;
  ms?: RawModuleStatus | null;
  test?: RawModuleTest | null;
  ls?: RawLesson[]; // lessons
}

export interface RawProgress {
  paid?: boolean;
  started_at?: string | null;
  cl?: number;      // completed_lessons
  ct?: number;      // completed_tests
  done?: boolean;   // is_completed
}

// Full Raw API Response for /courses/[slug]/
export interface RawCourseDetail {
  id: number;
  t: string;        // title
  s: string;        // slug
  desc?: string;    // description
  level: string;
  p?: number;       // price
  dp?: number | null; // discount_price
  vid?: RawVideo | null;
  tl?: number;      // total_lessons
  tt?: number;      // total_tests
  tm: number;       // total_modules
  students: number;
  mods?: RawModule[];
  progress?: RawProgress | null;
}

// Raw Course List Item for /courses/
export interface RawCourseListItem {
  id: number;
  t: string;        // title
  s: string;        // slug
  p?: number;       // price
  dp?: number | null;
  img?: string | null;
  tl?: number;
  tt?: number;
  paid?: boolean;
  cl?: number;
  ct?: number;
  done?: boolean;
  students?: number;
}

// Raw Hero Course
export interface RawHeroCourse {
  id: number;
  t: string;
  s: string;
  desc?: string;
  p?: number;
  dp?: number | null;
  vid?: RawVideo | null;
  tl?: number;
  tt?: number;
  students?: number;
}


// ==========================================================
// 2. FRONTEND MAPPED TYPES (UI Component'lar uchun qulay shakli)
// ==========================================================

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface CourseVideo {
  hls_url?: string;
  thumbnail?: string;
  duration?: number;
}

export interface CourseUserProgress {
  is_paid: boolean;
  started_at: string | null;
  completed_lessons: number;
  completed_tests: number;
  is_completed: boolean;
}

export interface LessonUserStatus {
  is_completed: boolean;
  finished_tasks: number;
}

export interface ModuleUserStatus {
  is_completed: boolean;
  completed_lessons: number;
  completed_tests: number;
}

export interface CourseLesson {
  id: number;
  title: string;
  slug: string;
  order: number;
  total_tasks: number;
  locked: boolean;
  user_status?: LessonUserStatus | null;
}

export interface TestResultSummary {
  attempted: boolean;
  score_pct: number | null;
  passed: boolean | null;
}

export interface ModuleTest {
  id: number;
  title: string;
  slug: string;
  duration_minutes: number;
  min_pass_percentage: number;
  result?: TestResultSummary | null;
}

export interface CourseModule {
  id: number;
  title: string;
  slug: string;
  order: number;
  total_lessons: number;
  total_tests: number;
  locked: boolean;
  user_status?: ModuleUserStatus | null;
  test?: ModuleTest | null;
  lessons: CourseLesson[];
}

export interface CourseListItem {
  id: number;
  title: string;
  slug: string;
  price: number;
  discount_price: number | null;
  thumbnail: string | null;
  total_lessons: number;
  total_tests: number;
  is_paid: boolean;
  completed_lessons: number;
  completed_tests: number;
  is_completed: boolean;
  students?: number;
}

export interface CourseHeroData {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: number;
  discount_price: number | null;
  video?: CourseVideo | null;
  total_lessons: number;
  total_tests: number;
  students: number;
}

export interface CourseDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: CourseLevel;
  price: number;
  discount_price: number | null;
  video?: CourseVideo | null;
  total_lessons: number;
  total_tests: number;
  total_modules: number;
  students: number;
  modules: CourseModule[];
  user_progress?: CourseUserProgress;
}

export interface TestBestResult {
  correct: number;
  wrong: number;
  unanswered: number;
  xp: number;
  completed_at?: string;
}

export interface TestInfo {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  min_pass_percentage: number;
  max_lifelines: number;
  question_count: number;
  video?: {
    hls_url: string | null;
    thumbnail: string | null;
  };
  best_result?: TestBestResult | null;
  active_session_id?: string | number | null;
}

// ==========================================================
// 3. LESSON QUIZ (embeddable savol widget)
// Manba: /api/courses/lesson/{slug}/quizzes/{questionId} aggregator
// (Django /lesson/{slug}/ + /questions/{id}/ birlashtirilgan holati)
// ==========================================================

export interface QuizChoice {
  id: number;
  text: string;
}

export interface QuizDetail {
  id?: number;
  text: string;
  xp: number;
  done: boolean;
  choices: QuizChoice[];
}

export interface QuizAnswerResult {
  answer: {
    correct: boolean;
  };
  explanation?: string | null;
  video?: {
    url?: string | null;
    thumbnail?: string | null;
  } | null;
}

// ==========================================================
// 4. MODUL TESTI — SESSION SAVOLLARI
// Manba: Django /modul/{modul_id}/test/start/ — kalitlar allaqachon
// to'liq nom bilan keladi (txt emas, "text"), qisqartirish yo'q.
// ==========================================================

export interface TestSessionChoice {
  id: number;
  text: string;
}

export interface TestQuestion {
  id: number;
  text: string;
  difficulty?: string;
  xp: number;
  choices: TestSessionChoice[];
}

export interface TestFinishResponse {
  correct: number;
  wrong: number;
  unanswered: number;
  xp: number;
  question_count: number;
  percentage: number;
  min_pass_percentage: number;
  passed: boolean;
  completed: boolean;
  already_completed: boolean;
  completed_at: string | null;
}