"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { BaseQuestionProps, BlankItem, QuestionSubmitResponse } from "@/lib/types/question";
import { MarkdownRenderer } from "../MarkdownRenderer";

interface Props extends BaseQuestionProps {
  blanks: BlankItem[];
  /** Yuborishda xato bo'lsa chaqiriladi (berilmasa xato avvalgidek tashqariga otiladi) */
  onError?: (err: unknown) => void;
}

export function FillBlanksQuestion({
  text,
  instruction,
  blanks = [],
  disabled = false,
  onAnswerSubmit,
  onError,
}: Props) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuestionSubmitResponse | null>(null);

  const handleChange = (blankId: number, val: string) => {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [blankId]: val }));
  };

  const isFilled =
    blanks.length > 0 &&
    blanks.every((b) => answers[b.id] && answers[b.id].trim().length > 0);

  const handleSubmit = async () => {
    if (!isFilled || disabled || isSubmitting || result) return;

    setIsSubmitting(true);
    try {
      const res = await onAnswerSubmit({
        answer_data: answers as Record<string, string>,
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
      {instruction && (
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
          {instruction}
        </p>
      )}

      <div className="text-lg font-medium text-slate-900"><MarkdownRenderer content={text}/></div>

      <div className="space-y-3">
        {blanks.map((b, i) => (
          <div key={b.id} className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
              #{i + 1}
            </span>
            <input
              type="text"
              disabled={disabled || isSubmitting || !!result}
              value={answers[b.id] || ""}
              onChange={(e) => handleChange(b.id, e.target.value)}
              placeholder="Javobni kiriting..."
              className={cn(
                "h-11 flex-1 rounded-xl border px-4 text-sm font-medium transition focus:outline-none focus:ring-2",
                !result && "border-slate-200 focus:border-amber-400 focus:ring-amber-200",
                result?.correct && "border-emerald-400 bg-emerald-50 text-emerald-900",
                result && !result.correct && "border-rose-400 bg-rose-50 text-rose-900"
              )}
            />
          </div>
        ))}
      </div>

      {!result ? (
        <button
          type="button"
          disabled={!isFilled || disabled || isSubmitting}
          onClick={handleSubmit}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          Yuborish
        </button>
      ) : (
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
                  To'g'ri to'ldirildi!
                </>
              ) : (
                <>
                  <XCircle className="size-4 text-rose-600" />
                  Noto'g'ri javob kiritildi!
                </>
              )}
            </span>
            {result.xp > 0 && <span className="text-xs font-bold text-amber-600">+{result.xp} XP</span>}
          </div>
          {result.explanation && <p className="mt-1 text-xs opacity-90">{result.explanation}</p>}
        </div>
      )}
    </div>
  );
}
