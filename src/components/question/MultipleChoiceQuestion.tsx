"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  BaseQuestionProps,
  ChoiceOption,
  QuestionSubmitResponse,
} from "@/lib/types/question";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";

interface Props extends BaseQuestionProps {
  choices: ChoiceOption[];
  multiple?: boolean;
  /** Yuborishda xato bo'lsa chaqiriladi (berilmasa xato avvalgidek tashqariga otiladi) */
  onError?: (err: unknown) => void;
}

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function MultipleChoiceQuestion({
  text,
  instruction,
  choices = [],
  multiple = false,
  disabled = false,
  onAnswerSubmit,
  onError,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] =
    useState<QuestionSubmitResponse | null>(null);

  const isLocked = disabled || isSubmitting || !!result;

  const handleSelect = (id: number) => {
    if (isLocked) return;

    if (multiple) {
      setSelectedIds((prev) => {
        if (prev.includes(id)) {
          return prev.filter((item) => item !== id);
        }

        return [...prev, id];
      });

      return;
    }

    setSelectedIds((prev) => {
      if (prev[0] === id) {
        return [];
      }

      return [id];
    });
  };

  const handleSubmit = async () => {
    if (
      selectedIds.length === 0 ||
      disabled ||
      isSubmitting ||
      result
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = multiple
        ? {
            selected_choice_ids: selectedIds,
          }
        : {
            choice_id: selectedIds[0],
          };

      const response = await onAnswerSubmit(payload);

      setResult(response);
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = selectedIds.length;

  return (
    <div className="w-full space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}
      <div className="space-y-3">
        {instruction && (
          <div
            className={cn(
              "inline-flex max-w-full items-center rounded-full",
              "border border-amber-200 bg-amber-50",
              "px-3 py-1.5",
              "text-xs font-bold uppercase tracking-wide text-amber-700"
            )}
          >
            <MarkdownRenderer
              content={instruction}
              inline
              className="text-amber-700"
            />
          </div>
        )}

        <div
          className={cn(
            "text-lg font-semibold leading-8 text-slate-900",
            "sm:text-xl"
          )}
        >
          <MarkdownRenderer
            content={text}
            inline
          />
        </div>

        {/* Multiple mode info */}
        {multiple && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Bir nechta javobni tanlang.
            </p>

            {selectedCount > 0 && (
              <span
                className={cn(
                  "shrink-0 rounded-full",
                  "bg-amber-50 px-2.5 py-1",
                  "text-xs font-bold text-amber-700",
                  "ring-1 ring-inset ring-amber-200"
                )}
              >
                {selectedCount} ta tanlandi
              </span>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          OPTIONS
      ===================================================== */}
      <div
        className="space-y-3"
        role={multiple ? "group" : "radiogroup"}
        aria-label="Javob variantlari"
      >
        {choices.map((choice, index) => {
          const isSelected = selectedIds.includes(choice.id);

          /**
           * Result holatida backend hozircha faqat
           * umumiy result.correct qaytaryapti.
           *
           * Shuning uchun:
           * - to'g'ri bo'lsa tanlangan variant yashil
           * - noto'g'ri bo'lsa tanlangan variant qizil
           *
           * Agar keyinchalik backend correct_choice_ids qaytarsa,
           * shu joyda har bir variantni alohida tekshirish mumkin.
           */
          const showCorrect = !!result && result.correct && isSelected;
          const showWrong = !!result && !result.correct && isSelected;

          const letter =
            OPTION_LETTERS[index] ?? String(index + 1);

          return (
            <button
              key={choice.id}
              type="button"
              disabled={isLocked}
              onClick={() => handleSelect(choice.id)}
              role={multiple ? "checkbox" : "radio"}
              aria-checked={isSelected}
              aria-label={`Variant ${letter}`}
              className={cn(
                "group relative flex w-full items-center gap-3",
                "rounded-2xl border-2 p-3.5 text-left",
                "transition-all duration-200",
                "focus:outline-none focus-visible:ring-4",
                "focus-visible:ring-amber-100",

                // Default
                !isSelected &&
                  !result &&
                  "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",

                // Selected
                isSelected &&
                  !result &&
                  "border-amber-400 bg-amber-50/70 shadow-sm ring-4 ring-amber-100/70",

                // Correct result
                showCorrect &&
                  "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm",

                // Wrong result
                showWrong &&
                  "border-rose-400 bg-rose-50 text-rose-950 shadow-sm",

                // Disabled
                isLocked &&
                  !result &&
                  "cursor-default opacity-80",

                // Result
                !!result && "cursor-default"
              )}
            >
              {/* =================================================
                  OPTION NUMBER / LETTER
              ================================================= */}
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center",
                  "rounded-xl border text-sm font-black",
                  "transition-colors duration-200",

                  !isSelected &&
                    !result &&
                    "border-slate-200 bg-slate-50 text-slate-500",

                  isSelected &&
                    !result &&
                    "border-amber-300 bg-white text-amber-700",

                  showCorrect &&
                    "border-emerald-300 bg-white text-emerald-700",

                  showWrong &&
                    "border-rose-300 bg-white text-rose-700"
                )}
              >
                {letter}
              </span>

              {/* =================================================
                  TEXT
              ================================================= */}
              <span className="min-w-0 flex-1">
                <MarkdownRenderer
                  content={choice.txt}
                  inline
                  className={cn(
                    "text-sm font-medium leading-6 sm:text-[15px]",

                    !isSelected &&
                      !result &&
                      "text-slate-700",

                    isSelected &&
                      !result &&
                      "text-slate-900",

                    showCorrect &&
                      "text-emerald-900",

                    showWrong &&
                      "text-rose-900"
                  )}
                />
              </span>

              {/* =================================================
                  CHECK / RADIO ICON
              ================================================= */}
              <span className="flex shrink-0 items-center justify-center">
                {!result && !isSelected && (
                  <>
                    {multiple ? (
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center",
                          "rounded-md border-2",
                          "border-slate-300 bg-white",
                          "transition-all duration-200",
                          "group-hover:border-amber-400"
                        )}
                      />
                    ) : (
                      <Circle
                        className={cn(
                          "size-6 text-slate-300",
                          "transition-colors duration-200",
                          "group-hover:text-amber-400"
                        )}
                      />
                    )}
                  </>
                )}

                {!result && isSelected && (
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center",
                      "rounded-full",
                      "bg-amber-500 text-white",
                      "shadow-sm"
                    )}
                  >
                    {multiple ? (
                      <Check className="size-4 stroke-[3]" />
                    ) : (
                      <span className="size-2.5 rounded-full bg-white" />
                    )}
                  </span>
                )}

                {showCorrect && (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center",
                      "rounded-full bg-emerald-500 text-white",
                      "shadow-sm"
                    )}
                  >
                    <CheckCircle2 className="size-5" />
                  </span>
                )}

                {showWrong && (
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center",
                      "rounded-full bg-rose-500 text-white",
                      "shadow-sm"
                    )}
                  >
                    <XCircle className="size-5" />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}
      {choices.length === 0 && (
        <div
          className={cn(
            "rounded-2xl border border-dashed",
            "border-slate-200 bg-slate-50",
            "px-5 py-8 text-center"
          )}
        >
          <p className="text-sm font-medium text-slate-500">
            Javob variantlari mavjud emas.
          </p>
        </div>
      )}

      {/* =====================================================
          ACTION
      ===================================================== */}
      {!result && choices.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            disabled={
              selectedCount === 0 ||
              disabled ||
              isSubmitting
            }
            onClick={handleSubmit}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2",
              "rounded-xl px-5",
              "bg-slate-900 text-sm font-bold text-white",
              "shadow-sm",
              "transition-all duration-200",
              "hover:bg-slate-800 hover:shadow-md",
              "active:scale-[0.99]",
              "focus:outline-none focus-visible:ring-4",
              "focus-visible:ring-slate-200",
              "disabled:cursor-not-allowed",
              "disabled:opacity-40",
              "disabled:shadow-none"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Tekshirilmoqda...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Javobni tasdiqlash
              </>
            )}
          </button>

          {selectedCount > 0 && (
            <p className="text-center text-xs text-slate-400">
              {multiple
                ? `${selectedCount} ta variant tanlandi`
                : "Variant tanlandi"}
            </p>
          )}
        </div>
      )}

      {/* =====================================================
          RESULT
      ===================================================== */}
      {result && (
        <div
          className={cn(
            "rounded-2xl border-2 p-5",
            "shadow-sm",

            result.correct
              ? "border-emerald-200 bg-emerald-50/80"
              : "border-rose-200 bg-rose-50/80"
          )}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center",
                "rounded-xl",

                result.correct
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-rose-100 text-rose-600"
              )}
            >
              {result.correct ? (
                <CheckCircle2 className="size-6" />
              ) : (
                <XCircle className="size-6" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4
                  className={cn(
                    "text-base font-bold",

                    result.correct
                      ? "text-emerald-900"
                      : "text-rose-900"
                  )}
                >
                  {result.correct
                    ? "To'g'ri javob!"
                    : "Noto'g'ri javob!"}
                </h4>

                {result.xp > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1",
                      "bg-amber-100",
                      "text-xs font-black text-amber-700",
                      "ring-1 ring-inset ring-amber-200"
                    )}
                  >
                    +{result.xp} XP
                  </span>
                )}
              </div>

              {result.explanation && (
                <div
                  className={cn(
                    "mt-2 text-sm leading-6",

                    result.correct
                      ? "text-emerald-800"
                      : "text-rose-800"
                  )}
                >
                  <MarkdownRenderer
                    content={result.explanation}
                    inline
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
