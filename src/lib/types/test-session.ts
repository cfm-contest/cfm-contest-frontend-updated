import { QuestionType } from "@/lib/types/question";

/* ==============================
   GET /courses/modul/{modul_id}/test/
============================== */

export interface TestInfoResponse {
  id: number;

  t: string;

  s: string;

  desc: string;

  dur: number;

  min_pct: number;

  qc: number;

  ml: number;

  vid: {
    hls: string | null;

    img: string | null;
  };

  best: {
    c: number;

    w: number;

    u: number;

    xp: number;

    at: string;
  } | null;

  as: string | null;
}

/* ==============================
   GET /courses/modul/{modul_id}/test/start

   Backend qaytaradi:
   {
     session_id, test {id,t,desc,dur,start,exp,qc,min_pct}, qs [...]
   }
============================== */

export interface TestSessionTest {
  id: number;

  t: string;

  desc: string;

  dur: number;

  start: string;

  exp: string;

  qc: number;

  min_pct: number;
}

export type PreviousAnswer =
  | {
      choice_id: number;
    }
  | {
      selected_choice_ids: number[];
    }
  | {
      answer_data: Record<string, unknown>;
    }
  | null;

export interface ChoiceQuestion {
  id: number;

  type:
    | QuestionType.SINGLE_CHOICE
    | QuestionType.MULTIPLE_CHOICE;

  txt: string;

  ins: string;

  dif: number | null;

  xp: number;

  prev: PreviousAnswer;

  ch: {
    id: number;

    txt: string;
  }[];
}

export interface MatchingQuestion {
  id: number;

  type: QuestionType.MATCHING;

  txt: string;

  ins: string;

  dif: number | null;

  xp: number;

  prev: PreviousAnswer;

  pl: {
    id: number;

    txt: string;

    o: number;
  }[];

  pr: {
    id: number;

    txt: string;
  }[];
}

export interface ArrangeQuestion {
  id: number;

  type: QuestionType.ARRANGE_WORDS;

  txt: string;

  ins: string;

  dif: number | null;

  xp: number;

  prev: PreviousAnswer;

  items: {
    id: number;

    txt: string;
  }[];
}

export interface FillBlankQuestion {
  id: number;

  type: QuestionType.FILL_BLANKS;

  txt: string;

  ins: string;

  dif: number | null;

  xp: number;

  prev: PreviousAnswer;

  bl: {
    id: number;

    p: number;
  }[];
}

export type TestSessionQuestion =
  | ChoiceQuestion
  | MatchingQuestion
  | ArrangeQuestion
  | FillBlankQuestion;

export interface TestSessionStartResponse {
  session_id: string;

  test: TestSessionTest;

  qs: TestSessionQuestion[];
}

/* ==============================
   LOCAL DRAFT (faqat frontend)
============================== */

export type AnswerDraft =
  | {
      type: "single";

      choiceId: number;
    }
  | {
      type: "multiple";

      choiceIds: number[];
    }
  | {
      type: "matching";

      data: Record<string, number>;
    }
  | {
      type: "arrange";

      data: Record<string, number>;
    }
  | {
      type: "blanks";

      data: Record<string, string>;
    };

/* ==============================
   POST /courses/test-session/{id}/answers/

   Backend (courses/api.py):
     class TestAnswerItem(msgspec.Struct):
         q: int
         choice_id: int | None = None
         selected_choice_ids: list[int] | None = None
         answer_data: dict | None = None

   MUHIM: savol ID kaliti `q` nomi bilan yuboriladi.
   `question_id` YUBORILMAYDI — aks holda 422.
============================== */

export interface SaveAnswersItem {
  /* question_id — backend buni `q` deb kutadi */
  q: number;

  /* SINGLE_CHOICE */
  choice_id?: number;

  /* MULTIPLE_CHOICE */
  selected_choice_ids?: number[];

  /* MATCHING / ARRANGE_WORDS / FILL_BLANKS */
  answer_data?: Record<string, unknown>;
}

export interface SaveAnswersPayload {
  answers: SaveAnswersItem[];
}

export interface SaveAnswersResponse {
  sid: string;

  sc: number;

  qc: number;
}

/* ==============================
   POST /courses/test-session/{id}/finish/
============================== */

export interface FinishResponse {
  c: number;

  w: number;

  u: number;

  xp: number;

  qc: number;

  pct: number;

  min_pct: number;

  pass: boolean;

  done: true;

  ac: boolean;

  at: string | null;
}

/* ==============================
   GET /courses/test-session/{id}/result/
============================== */

export interface TestResultReviewItem {
  q: number;

  txt: string;

  type: QuestionType;

  xp: number;

  given: Record<string, unknown> | null;

  correct: Record<string, unknown> | null;

  exp: string | null;

  vid: {
    hls: string;

    img: string | null;

    dur: number | null;
  } | null;

  answered: boolean;

  ok: boolean | null;
}

export interface TestResult {
  sid: string;

  t: string;

  done: boolean;

  c: number;

  w: number;

  u: number;

  xp: number;

  min_pct: number;

  rs: TestResultReviewItem[];
}