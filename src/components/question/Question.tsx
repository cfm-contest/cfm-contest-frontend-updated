"use client";

import { MultipleChoiceQuestion } from "./MultipleChoiceQuestion";
import { ArrangeWordsQuestion } from "./ArrangeWordsQuestion";
import { MatchingQuestion } from "./MatchingQuestion";
import { FillBlanksQuestion } from "./FillBlanksQuestion";

import {
  QuestionAnswerPayload,
  QuestionBackendResponse,
  QuestionSubmitResponse,
} from "@/lib/types/question";

interface QuestionProps {
  data: QuestionBackendResponse;
  /** true bo'lsa javob berib bo'lmaydi (contestda allaqachon javob berilgan / yopiq) */
  disabled?: boolean;
  /** Yuborishda xato bo'lsa chaqiriladi (berilmasa xato avvalgidek tashqariga otiladi) */
  onError?: (err: unknown) => void;
  onAnswerSubmit: (
    payload: QuestionAnswerPayload
  ) => Promise<QuestionSubmitResponse>;
}

export function Question({
  data,
  onAnswerSubmit,
  onError,
  disabled = false,
}: QuestionProps) {
  const baseProps = {
    questionId: data.id,
    text: data.txt,
    instruction: data.instruction,
    explanation: data.exp,
    disabled,
    onAnswerSubmit,
    onError,
  };

  const questionType = String(data.type || "").toUpperCase();

  switch (questionType) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoiceQuestion
          {...baseProps}
          choices={data.choices || []}
          multiple={true}
        />
      );

    case "SINGLE_CHOICE":
      return (
        <MultipleChoiceQuestion
          {...baseProps}
          choices={data.choices || []}
          multiple={false}
        />
      );

    case "ARRANGE_WORDS":
      // Backend "items" deb yuboradi, "arrange_items" emas
      return (
        <ArrangeWordsQuestion
          {...baseProps}
          items={data.items || []}
        />
      );

    case "MATCHING":
      // Backend chap/o'ng tomonlarni ALOHIDA yuboradi
      // (o'ng tomon aralashtirilgan holda)
      return (
        <MatchingQuestion
          {...baseProps}
          pairsLeft={data.pairs_left || []}
          pairsRight={data.pairs_right || []}
        />
      );

    case "FILL_BLANKS":
      return (
        <FillBlanksQuestion
          {...baseProps}
          blanks={data.blanks || []}
        />
      );

    default:

      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <div className="font-semibold">Noma&apos;lum savol turi</div>
          <div className="mt-1">
            Type: <strong>{String(data.type || "undefined")}</strong>
          </div>
        </div>
      );
  }
}
