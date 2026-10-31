
export function selectionToSearchParams(
  selection: LessonSelection
): Record<string, string> {
  switch (selection.type) {
    case "lecture":
      return { tab: "lecture", ref: selection.slug };
    case "problem":
      return { tab: "problem", ref: selection.slug };
    case "quiz":
      return { tab: "quiz", ref: String(selection.id) };
    default:
      return {};
  }
}

// ===============================
// LESSON SUMMARY
// (courses/api.py -> get_lesson bilan bir xil shakl)
// ===============================

export interface LessonSummary {
  id: number;
  t: string;        // title
  s: string;        // slug
  course_id: number;
  modul_id: number;
  tk: number;       // total_tasks
  lecs: {
    id: number;
    t: string;      // title
    s: string;      // slug
    o: number;      // order
    done: boolean;  // is_completed
  }[];
  probs: {
    id: number;
    t: string;      // title
    s: string;      // slug
    xp: number;
    done: boolean;  // is_completed
  }[];
  qs: {
    id: number;
    txt: string;    // text
    dif: string;    // difficulty
    xp: number;
    done: boolean;  // is_completed
  }[];
  us: {
    ft: number;     // finished_tasks
    done: boolean;  // is_completed
  };
}

// ===============================
// LECTURE
// (courses/api.py -> get_lecture bilan bir xil shakl)
// ===============================

export interface LectureDetail {
  id: number;
  title: string;
  body: string;
  xp: number;
  reading_time: number | null;
  is_completed: boolean;
  video: {
    hls_url: string | null;
    url: string | null;
    thumbnail: string | null;
    duration: number | null;
  };
}

export interface LectureCompleteResult {
  completed: boolean;
  xp: number;
}

// ===============================
// QUIZ
// (courses/api.py -> get_quiz / complete_quiz bilan bir xil shakl)
// ===============================

export interface QuizDetail {
  id: number;
  text: string;
  difficulty: string;  // backend get_quiz "difficulty" qaytaradi
  choices: {
    id: number;
    text: string;
  }[];
  done: boolean;
  xp: number;
}

export interface QuizCompleteResult {
  ans: {
    id: number;
    correct: boolean;
  };
  xp: number;
  exp: string | null;
  video?: {
    url: string | null;
    img: string | null;
    time: number | null;
  } | null;
}

// ===============================
// PROBLEM (preview)
// (courses/api.py -> get_problem bilan bir xil shakl)
// ===============================

export interface LessonProblemDetail {
  id: number;
  title: string;
  slug: string;
  desc: string;
  dif: string;
  xp: number;
  time_l: number;
  memory_l: number;
  cate_name: string | null;
  tags: { id: number; name: string }[];
  langs: { id: number; name: string; version: string }[];
  hints: { id: number; text: string }[];
  chall: { id: number; text: string }[];
  exam: { id: number; input: string; output: string; explanation: string | null }[];
  func: Record<string, { id: number; code: string }>;
  acceptance: number;
  solved: boolean;
}

// ===============================
// SELECTION
// ===============================

export type LessonSelection =
  | { type: "lecture"; slug: string }
  | { type: "problem"; slug: string }
  | { type: "quiz"; id: number }
  | { type: "none" };

// ===============================
// INITIAL SELECT
// ===============================

export function resolveInitialSelection(
  lesson: LessonSummary,
  searchParams: {
    tab?: string;
    ref?: string;
  }
): LessonSelection {
  const { tab, ref } = searchParams;

  if (tab === "lecture" && ref) {
    const lecture = lesson.lecs.find((x) => x.s === ref);
    if (lecture) {
      return { type: "lecture", slug: lecture.s };
    }
  }

  if (tab === "problem" && ref) {
    const problem = lesson.probs.find((x) => x.s === ref);
    if (problem) {
      return { type: "problem", slug: problem.s };
    }
  }

  if (tab === "quiz" && ref) {
    const quiz = lesson.qs.find((x) => String(x.id) === ref);
    if (quiz) {
      return { type: "quiz", id: quiz.id };
    }
  }

  // DEFAULT ORDER
  const lecture = [...lesson.lecs].sort((a, b) => a.o - b.o)[0];
  if (lecture) {
    return { type: "lecture", slug: lecture.s };
  }

  const problem = lesson.probs[0];
  if (problem) {
    return { type: "problem", slug: problem.s };
  }

  const quiz = lesson.qs[0];
  if (quiz) {
    return { type: "quiz", id: quiz.id };
  }

  return { type: "none" };
}