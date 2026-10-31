
"use client";

import { useState } from "react";
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

import {
  ArrangeItem,
  BaseQuestionProps,
  QuestionSubmitResponse,
} from "@/lib/types/question";

interface Props extends BaseQuestionProps {
  items: ArrangeItem[];
  /** Yuborishda xato bo'lsa chaqiriladi (berilmasa xato avvalgidek tashqariga otiladi) */
  onError?: (err: unknown) => void;
}

export function ArrangeWordsQuestion({
  text,
  instruction,
  items = [],
  disabled = false,
  onAnswerSubmit,
  onError,
}: Props) {
  const [pool, setPool] = useState<ArrangeItem[]>(items);
  const [selected, setSelected] = useState<ArrangeItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] =
    useState<QuestionSubmitResponse | null>(null);

  const handlePick = (item: ArrangeItem) => {
    if (disabled || isSubmitting || result) return;

    setPool((prev) =>
      prev.filter((w) => w.id !== item.id)
    );

    setSelected((prev) => [...prev, item]);
  };

  const handleUnpick = (item: ArrangeItem) => {
    if (disabled || isSubmitting || result) return;

    setSelected((prev) =>
      prev.filter((w) => w.id !== item.id)
    );

    setPool((prev) => [...prev, item]);
  };

  const handleReset = () => {
    if (disabled || isSubmitting || result) return;

    setPool(items);
    setSelected([]);
  };

  const handleSubmit = async () => {
    if (
      selected.length === 0 ||
      disabled ||
      isSubmitting ||
      result
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await onAnswerSubmit({
        answer_data: selected.reduce<Record<string, number>>(
          (acc, item, index) => {
            acc[String(index)] = item.id;
            return acc;
          },
          {}
        ),
      });

      setResult(res);
    } catch (err) {
      if (onError) onError(err);
      else throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Instruction */}
      {instruction && (
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          <MarkdownRenderer
            content={instruction}
            inline
          />
        </div>
      )}

      {/* Question */}
      <div className="text-lg font-medium text-slate-900">
        <MarkdownRenderer
          content={text}
          inline={false}
        />
      </div>

      {/* Selected words */}
      <div
        className={cn(
          "min-h-[72px] flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-4 transition-all",

          result?.correct &&
            "border-emerald-400 bg-emerald-50/50",

          result &&
            !result.correct &&
            "border-rose-400 bg-rose-50/50",

          !result &&
            "border-slate-200 bg-slate-50/50"
        )}
      >
        {selected.length === 0 ? (
          <span className="text-sm text-slate-400">
            So'zlarni bosib tartiblang...
          </span>
        ) : (
          selected.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={
                disabled ||
                isSubmitting ||
                !!result
              }
              onClick={() => handleUnpick(item)}
              className={cn(
                "rounded-lg px-3.5 py-1.5 text-sm font-medium text-white transition",

                result?.correct &&
                  "bg-emerald-600",

                result &&
                  !result.correct &&
                  "bg-rose-600",

                !result &&
                  "bg-slate-900 hover:bg-slate-800"
              )}
            >
              <MarkdownRenderer
                content={item.txt}
                inline
              />
            </button>
          ))
        )}
      </div>

      {/* Available words */}
      {!result && (
        <div className="flex flex-wrap gap-2">
          {pool.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled || isSubmitting}
              onClick={() => handlePick(item)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <MarkdownRenderer
                content={item.txt}
                inline
              />
            </button>
          ))}
        </div>
      )}

      {/* Buttons */}
      {!result ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={
              selected.length === 0 ||
              disabled ||
              isSubmitting
            }
            onClick={handleReset}
            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            <RefreshCw className="size-4" />
          </button>

          <button
            type="button"
            disabled={
              selected.length === 0 ||
              disabled ||
              isSubmitting
            }
            onClick={handleSubmit}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {isSubmitting && (
              <Loader2 className="size-4 animate-spin" />
            )}

            Tekshirish
          </button>
        </div>
      ) : (
        /* Result */
        <div
          className={cn(
            "rounded-xl border p-4 text-sm font-medium",

            result.correct
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          )}
        >
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-2">
              {result.correct ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Javob to'g'ri!
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-rose-600" />
                  Noto'g'ri ketma-ketlik!
                </>
              )}
            </span>

            {result.xp > 0 && (
              <span className="text-xs font-bold text-amber-600">
                +{result.xp} XP
              </span>
            )}
          </div>

          {result.explanation && (
            <div className="mt-1 text-xs opacity-90">
              <MarkdownRenderer
                content={result.explanation}
                inline={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
