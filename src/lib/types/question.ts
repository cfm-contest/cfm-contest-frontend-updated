export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  ARRANGE_WORDS = "ARRANGE_WORDS",
  MATCHING = "MATCHING",
  FILL_BLANKS = "FILL_BLANKS",
}

export interface ChoiceOption {
  id: number;
  txt: string;
}

// Backend: pairs_left ichidagi har bir element
export interface MatchingPairLeft {
  id: number;
  txt: string;
  o: number;
}

// Backend: pairs_right ichidagi har bir element
// (id — original pair.id, faqat tartibi aralashtirilgan)
export interface MatchingPairRight {
  id: number;
  txt: string;
}

export interface ArrangeItem {
  id: number;
  txt: string;
}

export interface BlankItem {
  id: number;
  pos: number;
  case: boolean;
}

export interface ExplanationVideo {
  hls: string;
  img: string | null;
  dur: number;
}

/**
 * Django:
 * GET /questions/{id}/
 */
export interface QuestionBackendResponse {
  id: number;
  txt: string;
  instruction: string;
  type: QuestionType;
  dif: string;
  xp: number;
  exp: string;
  vid: ExplanationVideo | null;

  choices?: ChoiceOption[];

  // MATCHING
  pairs_left?: MatchingPairLeft[];
  pairs_right?: MatchingPairRight[];

  // ARRANGE_WORDS
  items?: ArrangeItem[];

  // FILL_BLANKS
  blanks?: BlankItem[];
}

/**
 * POST /questions/{id}/answer/
 *
 * answer_data endi HAR DOIM "tekis" (flat) obyekt —
 * hech qanday qo'shimcha o'rovchi kalit (masalan "matches",
 * "blanks", "ordered_ids") ishlatilmaydi, chunki backend
 * shunday kutadi.
 */
export type QuestionAnswerPayload =
  | {
      choice_id: number;
      selected_choice_ids?: never;
      answer_data?: never;
    }
  | {
      choice_id?: never;
      selected_choice_ids: number[];
      answer_data?: never;
    }
  | {
      choice_id?: never;
      selected_choice_ids?: never;
      answer_data: Record<string, string | number>;
    };

/**
 * Django answer response
 */
export interface QuestionSubmitResponse {
  question_id: number;
  correct: boolean;
  xp: number;
  already_done: boolean;
  explanation?: string;
  video?: ExplanationVideo | null;
}

export interface BaseQuestionProps {
  questionId: number;
  text: string;
  instruction?: string;
  explanation?: string;
  disabled?: boolean;
  onAnswerSubmit: (
    payload: QuestionAnswerPayload
  ) => Promise<QuestionSubmitResponse>;
}