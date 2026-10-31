"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { Question } from "@/components/question/Question";
import type {
  QuestionAnswerPayload,
  QuestionBackendResponse,
  QuestionSubmitResponse,
} from "@/lib/types/question";
import { ContestApiError, answerContestQuestion } from "@/lib/contests/api";
import type { ContestQuestionData } from "@/lib/contests/types";
import { cn } from "@/lib/utils";

// NOTE: <Question> import yo'lini loyihangizga moslang (xato stackda: components/question/).

const TYPE_LABEL: Record<string, string> = {
  SINGLE_CHOICE: "Bitta javobli test",
  MULTIPLE_CHOICE: "Ko'p javobli test",
  MATCHING: "Moslashtirish",
  ARRANGE_WORDS: "So'zlarni tartiblash",
  FILL_BLANKS: "Bo'sh joylarni to'ldirish",
};

/** Foydalanuvchi tasdiqlash oynasida "Bekor qilish" ni bosdi — xato emas. */
class CancelledError extends Error {}

function isAlreadyAnswered(err: unknown) {
  if (!(err instanceof ContestApiError)) return false;
  return /already|answered|allaqachon/i.test(`${err.code} ${err.message}`);
}

interface Props {
  slug: string;
  letter: string;
  maxScore: number;
  data: ContestQuestionData;
  /** Vazifa ro'yxatidagi `cl` — bu savolga allaqachon javob berilgan */
  closed: boolean;
  canSubmit: boolean;
  /** Keyingi vazifa havolasi (oxirgisi bo'lsa null) */
  nextHref: string | null;
  backHref: string;
  /** Javob yuborilgach / "allaqachon javob berilgan" bo'lganda ro'yxatni yangilash */
  onAnswered: () => void;
}

export function ContestQuestionView({
  slug,
  letter,
  maxScore,
  data,
  closed,
  canSubmit,
  nextHref,
  backHref,
  onAnswered,
}: Props) {
  const [answered, setAnswered] = useState(false); // shu sessiyada yuborildi
  const [lockedByServer, setLockedByServer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ ok: () => void; cancel: () => void } | null>(null);
  const inFlight = useRef(false);

  const done = closed || answered || lockedByServer;
  const locked = done || !canSubmit;

  // Backend ichki turni `qtype` deb yuboradi, <Question> esa `type` o'qiydi.
  const questionData = useMemo(
    () => ({ ...data, type: data.qtype }) as unknown as QuestionBackendResponse,
    [data],
  );

  const askConfirm = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        setConfirming({
          ok: () => {
            setConfirming(null);
            resolve();
          },
          cancel: () => {
            setConfirming(null);
            reject(new CancelledError());
          },
        });
      }),
    [],
  );

  const handleAnswer = useCallback(
    async (payload: QuestionAnswerPayload): Promise<QuestionSubmitResponse> => {
      // Ikki marta bosish / parallel so'rovdan himoya
      if (inFlight.current || locked) throw new CancelledError();
      inFlight.current = true;
      setError(null);

      try {
        await askConfirm();

        const r = await answerContestQuestion(slug, data.id, payload as Record<string, unknown>);
        setAnswered(true);
        onAnswered();

        return {
          correct: Boolean(r.correct ?? r.is_correct),
          xp: Number(r.xp ?? r.score ?? 0),
          explanation: r.explanation ?? r.exp ?? null,
        } as QuestionSubmitResponse;
      } finally {
        inFlight.current = false;
      }
    },
    [slug, data.id, locked, askConfirm, onAnswered],
  );

  // Savol komponentlari xatoni shu yerga beradi (runtime overlay chiqmaydi)
  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof CancelledError) return;

      if (isAlreadyAnswered(err)) {
        setLockedByServer(true); // komponent `disabled` bo'ladi
        setError(null);
        onAnswered(); // sidebar/ro'yxat `cl` ni yangilasin
        return;
      }

      if (err instanceof ContestApiError && err.code === "login_required") {
        window.location.reload();
        return;
      }

      setError(
        err instanceof Error && err.message
          ? err.message
          : "Javobni yuborishda xatolik yuz berdi. Qayta urinib ko'ring.",
      );
    },
    [onAnswered],
  );

  // Escape — tasdiqlashni bekor qilish
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && confirming.cancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-2 py-4 sm:py-8">
        {/* Sarlavha */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-extrabold text-white shadow-sm shadow-blue-600/30">
            {letter}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              {TYPE_LABEL[data.qtype] ?? "Test savoli"}
            </p>
            <p className="text-xs text-neutral-400">Faqat bitta urinish</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
            <Sparkles className="size-3.5" />
            {maxScore} ball
          </span>
        </div>

        {/* Holat bannerlari */}
        {done ? (
          <Banner tone="success" icon={<CheckCircle2 className="size-4" />}>
            Javobingiz qabul qilindi. Bu savolga qayta javob berib bo'lmaydi.
          </Banner>
        ) : !canSubmit ? (
          <Banner tone="neutral" icon={<Lock className="size-4" />}>
            Hozir javob yuborish mumkin emas.
          </Banner>
        ) : (
          <Banner tone="info" icon={<Info className="size-4" />}>
            Diqqat: javobni faqat <b>bir marta</b> yuborish mumkin. Yuborgandan keyin o'zgartirib bo'lmaydi.
          </Banner>
        )}

        {error && (
          <Banner
            tone="error"
            icon={<AlertTriangle className="size-4" />}
            onClose={() => setError(null)}
          >
            {error}
          </Banner>
        )}

        {/* Savol */}
        <div
          className={cn(
            "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6",
            "dark:border-neutral-800",
            done && "bg-slate-50/60"
          )}
        >
          <Question
            data={questionData}
            disabled={locked}
            onAnswerSubmit={handleAnswer}
            onError={handleError}
          />
        </div>

        {/* Keyingi */}
        {done && (
          <div className="mt-4 flex justify-end">
            <Link
              href={nextHref ?? backHref}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {nextHref ? "Keyingi masala" : "Contestga qaytish"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Tasdiqlash oynasi */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Yopish"
            onClick={confirming.cancel}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-neutral-900"
          >
            <h2 id="confirm-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              Javobni yuborasizmi?
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              {letter} savoliga faqat bitta urinish beriladi. Yuborgandan keyin javobni o'zgartirib bo'lmaydi.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirming.cancel}
                className="h-11 flex-1 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                autoFocus
                onClick={confirming.ok}
                className="h-11 flex-1 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Yuborish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Banner({
  tone,
  icon,
  children,
  onClose,
}: {
  tone: "info" | "success" | "error" | "neutral";
  icon: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    neutral: "border-neutral-200 bg-neutral-50 text-neutral-600",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm", tones[tone])}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Yopish" className="shrink-0 opacity-60 hover:opacity-100">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
