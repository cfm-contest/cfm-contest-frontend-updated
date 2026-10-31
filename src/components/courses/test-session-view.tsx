"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Loader2,
  Shuffle,
  Sparkles,
  Target,
  Trophy,
  X,
} from "lucide-react";

import { QuestionType } from "@/lib/types/question";

import {
  finishTestSession,
  saveTestAnswers,
  startTestSession,
} from "@/lib/api/test-session";

import type {
  AnswerDraft,
  SaveAnswersItem,
  TestSessionQuestion,
  TestSessionStartResponse,
} from "@/lib/types/test-session";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";

import { getErrorMessage } from "@/lib/utils/api-error";

interface Props {
  modulId: number;
  courseSlug: string;
  testSlug: string;
  children: React.ReactNode;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function cn(
  ...classes: Array<string | false | null | undefined>
) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(
    2,
    "0"
  )}`;
}

/*
 * Lokal AnswerDraft -> backend payload (SaveAnswersItem).
 *
 * Backend TestAnswerItem (msgspec.Struct):
 *   q: int
 *   choice_id: int | None
 *   selected_choice_ids: list[int] | None
 *   answer_data: dict | None
 *
 * DIQQAT: kalit `q` bo'lishi SHART. `question_id` yuborilsa
 * backend 422 qaytaradi (extra/unknown field yoki q yetishmaydi).
 */
function draftToPayload(
  questionId: number,
  draft: AnswerDraft
): SaveAnswersItem {
  if (draft.type === "single") {
    return {
      q: questionId,
      choice_id: draft.choiceId,
    };
  }

  if (draft.type === "multiple") {
    return {
      q: questionId,
      selected_choice_ids: draft.choiceIds,
    };
  }

  // matching / arrange / blanks
  return {
    q: questionId,
    answer_data: draft.data,
  };
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function TestSessionPage({
  modulId,
  courseSlug,
  testSlug,
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] =
    useState<TestSessionStartResponse | null>(null);

  const [answers, setAnswers] = useState<
    Record<number, AnswerDraft>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [finishing, setFinishing] = useState(false);

  /*
   * answersRef — interval/timeout callbacklarida eng so'nggi
   * answers holatiga ishongani uchun.
   */
  const answersRef = useRef(answers);

  const finishRef = useRef<() => Promise<void>>(
    async () => {}
  );

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  /* ------------------------------------------------------------------------ */
  /* Current question                                                         */
  /* ------------------------------------------------------------------------ */

  const currentIndex = useMemo(() => {
    const match = pathname.match(/\/question\/(\d+)/);

    if (!match) return 0;

    const number = Number.parseInt(match[1], 10);

    if (!Number.isFinite(number)) return 0;

    return Math.max(0, number - 1);
  }, [pathname]);

  const currentQuestion =
    session?.qs[currentIndex];

  /* ------------------------------------------------------------------------ */
  /* Progress                                                                 */
  /* ------------------------------------------------------------------------ */

  const answeredCount = useMemo(() => {
    if (!session) return 0;

    return session.qs.filter((question) =>
      Boolean(answers[question.id])
    ).length;
  }, [answers, session]);

  const progress = session
    ? Math.round(
        (answeredCount /
          Math.max(session.qs.length, 1)) *
          100
      )
    : 0;

  /* ------------------------------------------------------------------------ */
  /* Load session + restore previous answers                                  */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await startTestSession(modulId);

        if (!mounted) return;

        const restoredAnswers: Record<
          number,
          AnswerDraft
        > = {};

        for (const question of data.qs) {
          const previous = question.prev;

          if (!previous) continue;

          if ("choice_id" in previous) {
            restoredAnswers[question.id] = {
              type: "single",
              choiceId: previous.choice_id,
            };
          }

          if ("selected_choice_ids" in previous) {
            restoredAnswers[question.id] = {
              type: "multiple",
              choiceIds:
                previous.selected_choice_ids,
            };
          }

          if ("answer_data" in previous) {
            const raw = previous.answer_data;

            if (
              question.type ===
              QuestionType.MATCHING
            ) {
              restoredAnswers[question.id] = {
                type: "matching",
                data: raw as Record<string, number>,
              };
            }

            if (
              question.type ===
              QuestionType.ARRANGE_WORDS
            ) {
              restoredAnswers[question.id] = {
                type: "arrange",
                data: raw as Record<string, number>,
              };
            }

            if (
              question.type ===
              QuestionType.FILL_BLANKS
            ) {
              restoredAnswers[question.id] = {
                type: "blanks",
                data: raw as Record<string, string>,
              };
            }
          }
        }

        setSession(data);
        setAnswers(restoredAnswers);

        const expiresAt = new Date(
          data.test.exp
        ).getTime();

        setRemaining(
          Math.max(
            0,
            Math.floor(
              (expiresAt - Date.now()) / 1000
            )
          )
        );
      } catch (err) {
        if (!mounted) return;

        setError(getErrorMessage(err));
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [modulId]);

  /* ------------------------------------------------------------------------ */
  /* Invalid question URL                                                     */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      session &&
      currentIndex >= session.qs.length
    ) {
      router.replace(
        `/courses/${courseSlug}/test/${testSlug}/question/1`
      );
    }
  }, [
    session,
    currentIndex,
    courseSlug,
    testSlug,
    router,
  ]);

  /* ------------------------------------------------------------------------ */
  /* Update answer — FAQAT lokal state!                                       */
  /*                                                                          */
  /* MUHIM: Bu yerda saveTestAnswers CHAQIRILMAYDI.                           */
  /* Backend dizayni: barcha javoblar faqat "Tugatish" bosilganda,            */
  /* bitta bulk POST /answers/ bilan yuboriladi.                              */
  /* ------------------------------------------------------------------------ */

  const updateAnswer = useCallback(
    (questionId: number, draft: AnswerDraft) => {
      setAnswers((previous) => ({
        ...previous,
        [questionId]: draft,
      }));
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                               */
  /* ------------------------------------------------------------------------ */

  const goToQuestion = useCallback(
    (index: number) => {
      if (!session) return;

      if (
        index < 0 ||
        index >= session.qs.length
      ) {
        return;
      }

      router.push(
        `/courses/${courseSlug}/test/${testSlug}/question/${
          index + 1
        }`
      );
    },
    [
      session,
      courseSlug,
      testSlug,
      router,
    ]
  );

  /* ------------------------------------------------------------------------ */
  /* Finish test                                                              */
  /*                                                                          */
  /* Oqim:                                                                    */
  /*   1. Barcha lokal javoblarni payloadga yig'ish                           */
  /*   2. BIR MARTA POST /answers/  (agar javoblar bo'lsa)                    */
  /*   3. POST /finish/                                                       */
  /*   4. Result sahifasiga o'tish                                            */
  /*                                                                          */
  /* Vaqt tugaganda ham xuddi shu funksiya interval orqali chaqiriladi.       */
  /* ------------------------------------------------------------------------ */

  const finish = useCallback(async () => {
    if (!session || finishing) return;

    setFinishing(true);
    setError(null);

    try {
      const payloadAnswers: SaveAnswersItem[] =
        Object.entries(answersRef.current).map(
          ([questionId, draft]) =>
            draftToPayload(
              Number(questionId),
              draft
            )
        );

      if (payloadAnswers.length > 0) {
        await saveTestAnswers(
          session.session_id,
          {
            answers: payloadAnswers,
          }
        );
      }

      await finishTestSession(
        session.session_id
      );

      router.push(
        `/courses/${courseSlug}/test/${testSlug}/result/${session.session_id}`
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setFinishing(false);
    }
  }, [
    session,
    finishing,
    router,
    courseSlug,
    testSlug,
  ]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  /* ------------------------------------------------------------------------ */
  /* Timer                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!session) return;

    const timer = window.setInterval(() => {
      setRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);

          /*
           * Vaqt tugadi — avtomatik yakunlash.
           * Bu yerda ham barcha javoblar bitta
           * bulk /answers/ so'rovi bilan ketadi.
           */
          void finishRef.current();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [session]);

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
            <Loader2 className="size-8 animate-spin" />
          </div>

          <p className="text-sm font-semibold text-slate-500">
            Test yuklanmoqda...
          </p>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error / no session                                                       */
  /* ------------------------------------------------------------------------ */

  if (!session || !currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-5">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50">
            <AlertCircle className="size-7 text-rose-500" />
          </div>

          <h1 className="mt-4 text-xl font-black text-slate-900">
            Test topilmadi
          </h1>

          <p className="mt-2 break-words text-sm leading-6 text-slate-500">
            {error ??
              "Noma'lum xatolik yuz berdi."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                `/courses/${courseSlug}/test/${testSlug}`
              )
            }
            className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Testga qaytish
          </button>
        </div>
      </main>
    );
  }

  const timerIsLow = remaining <= 60;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 size-[420px] rounded-full bg-indigo-200/40 blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 size-[420px] rounded-full bg-violet-200/40 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ---------------------------------------------------------------- */}

        <header className="mb-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-lg sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200">
                <Trophy className="size-5" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Test arena
                </p>

                <h2 className="mt-0.5 truncate text-lg font-black text-slate-900">
                  {session.test.t}
                </h2>
              </div>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-black tabular-nums",
                timerIsLow
                  ? "border-rose-200 bg-rose-50 text-rose-600"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              <Clock3 className="size-4" />
              {formatTime(remaining)}
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500">
              <span>Test progressi</span>

              <span>
                {answeredCount}/{session.qs.length}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Main grid                                                         */}
        {/* ---------------------------------------------------------------- */}

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* ---------------------------------------------------------------- */}
          {/* Sidebar                                                          */}
          {/* ---------------------------------------------------------------- */}

          <aside className="hidden lg:block">
            <div className="sticky top-5 rounded-[28px] border border-slate-200 bg-white p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Savollar
                </span>

                <Target className="size-4 text-indigo-500" />
              </div>

              <div className="grid grid-cols-4 gap-2">
                {session.qs.map(
                  (question, index) => {
                    const isCurrent =
                      index === currentIndex;

                    const isAnswered =
                      Boolean(
                        answers[question.id]
                      );

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() =>
                          goToQuestion(index)
                        }
                        aria-label={`Savol ${
                          index + 1
                        }`}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-2xl text-xs font-black transition-all duration-200",
                          isCurrent &&
                            "bg-slate-900 text-white shadow-lg shadow-slate-200",
                          !isCurrent &&
                            isAnswered &&
                            "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-300",
                          !isCurrent &&
                            !isAnswered &&
                            "border border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
                        )}
                      >
                        {index + 1}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-slate-900" />
                  Joriy savol
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Javob berilgan
                </div>

                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-slate-200" />
                  Javobsiz
                </div>
              </div>
            </div>
          </aside>

          {/* ---------------------------------------------------------------- */}
          {/* Question area                                                    */}
          {/* ---------------------------------------------------------------- */}

          <section className="min-w-0">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-xl sm:p-6 lg:p-8">
              {/* Question header */}
              <div className="mb-8 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600">
                    <Sparkles className="size-3.5" />
                    Savol {currentIndex + 1}
                  </div>

                  <div className="text-xl font-black leading-tight text-slate-900 sm:text-2xl lg:text-3xl">
                    <MarkdownRenderer
                      content={currentQuestion.txt}
                      inline={false}
                    />
                  </div>

                  {currentQuestion.ins && (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {currentQuestion.ins}
                    </p>
                  )}
                </div>

                <div className="hidden shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    XP
                  </p>

                  <p className="mt-1 text-lg font-black text-amber-600">
                    +{currentQuestion.xp}
                  </p>
                </div>
              </div>

              {/* Question renderer */}
              <QuestionRenderer
                question={currentQuestion}
                draft={
                  answers[currentQuestion.id]
                }
                onChange={(draft) =>
                  updateAnswer(
                    currentQuestion.id,
                    draft
                  )
                }
              />

              {/* Error */}
              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />

                  <span className="min-w-0 break-words leading-6">
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setError(null)
                    }
                    className="ml-auto shrink-0 rounded-lg p-1 text-rose-400 transition hover:bg-rose-100 hover:text-rose-600"
                    aria-label="Xatoni yopish"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Mobile question navigation                                      */}
            {/* ---------------------------------------------------------------- */}

            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:hidden">
              <div className="flex min-w-max gap-2">
                {session.qs.map(
                  (question, index) => (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() =>
                        goToQuestion(index)
                      }
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl text-xs font-black transition",
                        index ===
                          currentIndex &&
                          "bg-slate-900 text-white",
                        index !==
                          currentIndex &&
                          answers[question.id] &&
                          "bg-emerald-50 text-emerald-600",
                        index !==
                          currentIndex &&
                          !answers[question.id] &&
                          "bg-slate-100 text-slate-500"
                      )}
                    >
                      {index + 1}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Navigation buttons                                               */
            /* ---------------------------------------------------------------- */}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() =>
                  goToQuestion(
                    currentIndex - 1
                  )
                }
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="size-5" />
                Oldingi
              </button>

              {currentIndex <
              session.qs.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    goToQuestion(
                      currentIndex + 1
                    )
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Keyingi
                  <ArrowRight className="size-5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() =>
                    void finish()
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {finishing ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}

                  {finishing
                    ? "Yakunlanmoqda..."
                    : "Testni yakunlash"}
                </button>
              )}
            </div>

            <div className="hidden">
              {children}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* Question renderer                                                          */
/* ========================================================================== */

interface QuestionRendererProps {
  question: TestSessionQuestion;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
}

function QuestionRenderer({
  question,
  draft,
  onChange,
}: QuestionRendererProps) {
  switch (question.type) {
    case QuestionType.SINGLE_CHOICE:
    case QuestionType.MULTIPLE_CHOICE:
      return (
        <ChoiceQuestion
          question={question}
          draft={draft}
          onChange={onChange}
        />
      );

    case QuestionType.MATCHING:
      return (
        <MatchingQuestion
          question={question}
          draft={draft}
          onChange={onChange}
        />
      );

    case QuestionType.ARRANGE_WORDS:
      return (
        <ArrangeQuestion
          question={question}
          draft={draft}
          onChange={onChange}
        />
      );

    case QuestionType.FILL_BLANKS:
      return (
        <FillBlankQuestion
          question={question}
          draft={draft}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

/* ========================================================================== */
/* Choice question                                                            */
/* ========================================================================== */

function ChoiceQuestion({
  question,
  draft,
  onChange,
}: {
  question: Extract<
    TestSessionQuestion,
    {
      type:
        | QuestionType.SINGLE_CHOICE
        | QuestionType.MULTIPLE_CHOICE;
    }
  >;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
}) {
  const isMultiple =
    question.type ===
    QuestionType.MULTIPLE_CHOICE;

  return (
    <div className="space-y-3">
      {question.ch.map((choice, index) => {
        const selected = isMultiple
          ? draft?.type === "multiple" &&
            draft.choiceIds.includes(choice.id)
          : draft?.type === "single" &&
            draft.choiceId === choice.id;

        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => {
              if (!isMultiple) {
                onChange({
                  type: "single",
                  choiceId: choice.id,
                });
                return;
              }

              const old =
                draft?.type === "multiple"
                  ? draft.choiceIds
                  : [];

              onChange({
                type: "multiple",
                choiceIds: old.includes(
                  choice.id
                )
                  ? old.filter(
                      (id) => id !== choice.id
                    )
                  : [...old, choice.id],
              });
            }}
            className={cn(
              "group flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200",
              selected
                ? "border-indigo-300 bg-indigo-50 shadow-lg shadow-indigo-100"
                : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-slate-50 hover:shadow-md"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl border text-sm font-black transition",
                selected
                  ? "border-indigo-400 bg-indigo-600 text-white shadow-md"
                  : "border-slate-200 bg-slate-50 text-slate-500"
              )}
            >
              {String.fromCharCode(
                65 + index
              )}
            </span>

            <span
              className={cn(
                "min-w-0 flex-1 text-sm font-semibold leading-6",
                selected
                  ? "text-indigo-900"
                  : "text-slate-700"
              )}
            >
              <MarkdownRenderer
                content={choice.txt}
                inline
              />
            </span>

            {selected && (
              <CheckCircle2 className="size-5 shrink-0 text-indigo-600" />
            )}
          </button>
        );
      })}

      {isMultiple && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-700">
          Bir nechta javobni tanlashingiz
          mumkin.
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Matching question                                                          */
/* ========================================================================== */

interface MatchingLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function MatchingQuestion({
  question,
  draft,
  onChange,
}: {
  question: Extract<
    TestSessionQuestion,
    { type: QuestionType.MATCHING }
  >;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
}) {
  const value =
    draft?.type === "matching"
      ? draft.data
      : {};

  const [rightItems, setRightItems] =
    useState(() => [...question.pr]);

  const [selectedLeft, setSelectedLeft] =
    useState<number | null>(null);

  const [selectedRight, setSelectedRight] =
    useState<number | null>(null);

  /* ------------------------------------------------------------------------ */
  /* Connecting-line overlay refs                                             */
  /* ------------------------------------------------------------------------ */

  const containerRef = useRef<HTMLDivElement | null>(null);

  const leftAnchors = useRef<Map<number, HTMLSpanElement>>(
    new Map()
  );

  const rightAnchors = useRef<Map<number, HTMLSpanElement>>(
    new Map()
  );

  /*
   * `lines` state YO'Q. setLines chaqiruvi
   * "Maximum update depth exceeded" siklini
   * keltirib chiqargan edi. Chiziqlar render
   * paytida useMemo orqali DOM'dan o'qiladi,
   * layoutVersion faqat ResizeObserver/scroll
   * triggeri uchun.
   */
  const [layoutVersion, setLayoutVersion] =
    useState(0);

  const registerLeftAnchor = useCallback(
    (id: number) => (el: HTMLSpanElement | null) => {
      if (el) {
        leftAnchors.current.set(id, el);
      } else {
        leftAnchors.current.delete(id);
      }
    },
    []
  );

  const registerRightAnchor = useCallback(
    (id: number) => (el: HTMLSpanElement | null) => {
      if (el) {
        rightAnchors.current.set(id, el);
      } else {
        rightAnchors.current.delete(id);
      }
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Reset when question changes                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    setRightItems([...question.pr]);
    setSelectedLeft(null);
    setSelectedRight(null);
  }, [question.id, question.pr]);

  const connections = useMemo(
    () => Object.entries(value),
    [value]
  );

  const connectedRightIds = useMemo(
    () =>
      new Set(
        connections.map(([, rightId]) =>
          Number(rightId)
        )
      ),
    [connections]
  );

  /* ------------------------------------------------------------------------ */
  /* Chiziqlarni render vaqtida hisoblash (state'siz)                         */
  /* ------------------------------------------------------------------------ */

  const lines = useMemo<MatchingLine[]>(() => {
    const container = containerRef.current;

    if (!container) return [];

    const containerRect = container.getBoundingClientRect();

    const nextLines: MatchingLine[] = [];

    for (const [leftIdStr, rightIdRaw] of connections) {
      const leftEl = leftAnchors.current.get(
        Number(leftIdStr)
      );
      const rightEl = rightAnchors.current.get(
        Number(rightIdRaw)
      );

      if (!leftEl || !rightEl) continue;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      nextLines.push({
        key: leftIdStr,
        x1: leftRect.right - containerRect.left,
        y1:
          leftRect.top +
          leftRect.height / 2 -
          containerRect.top,
        x2: rightRect.left - containerRect.left,
        y2:
          rightRect.top +
          rightRect.height / 2 -
          containerRect.top,
      });
    }

    return nextLines;

    /* layoutVersion ataylab kiritilgan — faqat trigger */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, rightItems, layoutVersion]);

  /* ------------------------------------------------------------------------ */
  /* Layout o'zgarishlarida qayta hisoblash triggeri                          */
  /* ------------------------------------------------------------------------ */

  const bumpLayoutVersion = useCallback(() => {
    setLayoutVersion((previous) => previous + 1);
  }, []);

  useLayoutEffect(() => {
    /* Birinchi mount va shuffle/reset dan keyin
       anchorlar joylashgach chiziqlarni qayta
       hisoblaymiz. layoutVersion'ga bog'liq
       EMAS — sikl yo'q. */
    bumpLayoutVersion();
  }, [question.id, rightItems, bumpLayoutVersion]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    let frame = 0;

    const scheduleBump = () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        bumpLayoutVersion();
        frame = 0;
      });
    };

    const observer = new ResizeObserver(scheduleBump);

    observer.observe(container);

    window.addEventListener("resize", scheduleBump);

    window.addEventListener("scroll", scheduleBump, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleBump);
      window.removeEventListener("scroll", scheduleBump, true);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [question.id, bumpLayoutVersion]);

  /* ------------------------------------------------------------------------ */
  /* Connect                                                                  */
  /* ------------------------------------------------------------------------ */

  const connect = useCallback(
    (leftId: number, rightId: number) => {
      const next = { ...value };

      Object.entries(next).forEach(
        ([key, currentRight]) => {
          if (
            Number(key) === leftId ||
            Number(currentRight) === rightId
          ) {
            delete next[key];
          }
        }
      );

      next[String(leftId)] = rightId;

      onChange({
        type: "matching",
        data: next,
      });

      setSelectedLeft(null);
      setSelectedRight(null);
    },
    [value, onChange]
  );

  /* ------------------------------------------------------------------------ */
  /* Select left                                                              */
  /* ------------------------------------------------------------------------ */

  const selectLeft = useCallback(
    (id: number) => {
      if (selectedRight !== null) {
        connect(id, selectedRight);
        return;
      }

      setSelectedLeft((previous) =>
        previous === id ? null : id
      );
    },
    [selectedRight, connect]
  );

  /* ------------------------------------------------------------------------ */
  /* Select right                                                             */
  /* ------------------------------------------------------------------------ */

  const selectRight = useCallback(
    (id: number) => {
      if (selectedLeft !== null) {
        connect(selectedLeft, id);
        return;
      }

      setSelectedRight((previous) =>
        previous === id ? null : id
      );
    },
    [selectedLeft, connect]
  );

  /* ------------------------------------------------------------------------ */
  /* Remove connection                                                        */
  /* ------------------------------------------------------------------------ */

  const remove = useCallback(
    (leftId: number) => {
      const next = { ...value };

      delete next[String(leftId)];

      onChange({
        type: "matching",
        data: next,
      });
    },
    [value, onChange]
  );

  /* ------------------------------------------------------------------------ */
  /* Clear all                                                                */
  /* ------------------------------------------------------------------------ */

  const clearAll = useCallback(() => {
    onChange({
      type: "matching",
      data: {},
    });

    setSelectedLeft(null);
    setSelectedRight(null);
  }, [onChange]);

  /* ------------------------------------------------------------------------ */
  /* Shuffle right side                                                       */
  /* ------------------------------------------------------------------------ */

  const shuffle = useCallback(() => {
    setRightItems((previous) => {
      const next = [...previous];

      for (
        let index = next.length - 1;
        index > 0;
        index--
      ) {
        const random = Math.floor(
          Math.random() * (index + 1)
        );

        [next[index], next[random]] = [
          next[random],
          next[index],
        ];
      }

      return next;
    });
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Progress                                                                 */
  /* ------------------------------------------------------------------------ */

  const totalPairs = question.pl.length;

  const connectedCount = connections.length;

  const matchingProgress =
    totalPairs > 0
      ? Math.round(
          (connectedCount / totalPairs) * 100
        )
      : 0;

  const isComplete =
    totalPairs > 0 &&
    connectedCount === totalPairs;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-5">
      {/* Matching progress */}
      <div
        className={cn(
          "rounded-3xl border p-4 transition",
          isComplete
            ? "border-emerald-200 bg-emerald-50"
            : "border-indigo-100 bg-indigo-50/50"
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Moslashtirish
            </p>

            <p className="mt-1 text-sm font-bold text-slate-700">
              {isComplete
                ? "Barcha juftliklar ulandi"
                : "Mos juftliklarni birlashtiring"}
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-black",
              isComplete
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white text-indigo-600"
            )}
          >
            {connectedCount}/{totalPairs}
          </div>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-white">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                : "bg-gradient-to-r from-indigo-500 to-violet-500"
            )}
            style={{
              width: `${matchingProgress}%`,
            }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-400">
          Chapdagi elementni, keyin unga mos
          o‘ngdagi elementni tanlang.
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={shuffle}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Shuffle className="size-4" />
            Aralashtirish
          </button>

          {connectedCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-500 shadow-sm transition hover:bg-rose-50"
            >
              <X className="size-4" />
              Tozalash
            </button>
          )}
        </div>
      </div>

      {/* Columns + connecting lines overlay */}
      <div
        ref={containerRef}
        className="relative grid gap-5 lg:grid-cols-2"
      >
        {/*
          Bog'lovchi chiziqlar faqat lg breakpointda
          (ustunlar yonma-yon bo'lganda) chiziladi.
        */}
        <svg
          className="pointer-events-none absolute inset-0 z-10 hidden lg:block"
          width="100%"
          height="100%"
          preserveAspectRatio="none"
        >
          {lines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#10b981"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeOpacity={0.55}
            />
          ))}
        </svg>

        {/* ---------------------------------------------------------------- */}
        {/* Left                                                              */}
        {/* ---------------------------------------------------------------- */}

        <div className="relative z-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Chap tomon
            </p>

            <span className="text-[11px] font-bold text-slate-400">
              {question.pl.length} ta
            </span>
          </div>

          {question.pl.map((left, index) => {
            const rightId =
              value[String(left.id)];

            const isSelected =
              selectedLeft === left.id;

            const isConnected =
              rightId != null;

            const connectedRight = rightItems.find(
              (item) =>
                item.id === Number(rightId)
            );

            return (
              <div
                key={left.id}
                className={cn(
                  "relative overflow-visible rounded-2xl border-2 bg-white transition-all duration-200",
                  isSelected &&
                    "border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100 ring-4 ring-indigo-100",
                  isConnected &&
                    !isSelected &&
                    "border-emerald-300 bg-emerald-50",
                  !isSelected &&
                    !isConnected &&
                    "border-slate-200 hover:border-indigo-200 hover:shadow-md"
                )}
              >
                <button
                  type="button"
                  onClick={() =>
                    selectLeft(left.id)
                  }
                  className="flex min-h-[78px] w-full items-center gap-3 p-3 text-left"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition",
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : isConnected
                        ? "bg-emerald-500 text-white"
                        : "bg-indigo-50 text-indigo-600"
                    )}
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1 text-sm font-bold leading-6 text-slate-700">
                    <MarkdownRenderer
                      content={left.txt}
                      inline
                    />
                  </span>

                  {/* Chiziq shu nuqtaga ulanadi (o'ng chekka) */}
                  <span
                    ref={registerLeftAnchor(left.id)}
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-white transition",
                      isSelected
                        ? "border-indigo-400"
                        : isConnected
                        ? "border-emerald-400"
                        : "border-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "size-3 rounded-full transition",
                        isSelected
                          ? "bg-indigo-500"
                          : isConnected
                          ? "bg-emerald-500"
                          : "bg-white"
                      )}
                    />
                  </span>
                </button>

                {/* Connected pair label */}
                {connectedRight && (
                  <div className="border-t border-emerald-100 bg-emerald-50/70 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Check className="size-3.5 shrink-0 text-emerald-600" />

                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-emerald-700">
                        {connectedRight.txt}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          remove(left.id)
                        }
                        className="flex size-6 shrink-0 items-center justify-center rounded-lg text-emerald-500 transition hover:bg-white hover:text-rose-500"
                        aria-label="Juftlikni olib tashlash"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {isConnected && (
                  <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border border-emerald-200 bg-white shadow-sm">
                    <Check className="size-3.5 text-emerald-600" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right                                                             */}
        {/* ---------------------------------------------------------------- */}

        <div className="relative z-20 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              O‘ng tomon
            </p>

            <span className="text-[11px] font-bold text-slate-400">
              {rightItems.length} ta
            </span>
          </div>

          {rightItems.map((right, index) => {
            const isConnected =
              connectedRightIds.has(right.id);

            const isSelected =
              selectedRight === right.id;

            return (
              <button
                key={right.id}
                type="button"
                onClick={() =>
                  selectRight(right.id)
                }
                className={cn(
                  "flex min-h-[78px] w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-left shadow-sm transition-all duration-200",
                  isSelected &&
                    "border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100 ring-4 ring-indigo-100",
                  isConnected &&
                    !isSelected &&
                    "border-emerald-300 bg-emerald-50",
                  !isSelected &&
                    !isConnected &&
                    "border-slate-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                )}
              >
                {/* Chiziq shu nuqtaga ulanadi (chap chekka) */}
                <span
                  ref={registerRightAnchor(right.id)}
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-black transition",
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : isConnected
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-50 text-slate-400"
                  )}
                >
                  {index + 1}
                </span>

                <span className="min-w-0 flex-1 text-sm font-bold leading-6 text-slate-700">
                  <MarkdownRenderer
                    content={right.txt}
                    inline
                  />
                </span>

                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 bg-white transition",
                    isSelected
                      ? "border-indigo-400"
                      : isConnected
                      ? "border-emerald-400"
                      : "border-slate-300"
                  )}
                >
                  {isConnected ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <span
                      className={cn(
                        "size-3 rounded-full",
                        isSelected
                          ? "bg-indigo-500"
                          : "bg-white"
                      )}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom instruction */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
          isComplete
            ? "border-emerald-200 bg-emerald-50"
            : "border-slate-200 bg-slate-50"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
              isComplete
                ? "bg-emerald-100 text-emerald-600"
                : "bg-white text-indigo-500"
            )}
          >
            {isComplete ? (
              <Check className="size-4" />
            ) : (
              <Target className="size-4" />
            )}
          </div>

          <div>
            <p
              className={cn(
                "text-xs font-black",
                isComplete
                  ? "text-emerald-700"
                  : "text-slate-600"
              )}
            >
              {isComplete
                ? "Moslashtirish tugallandi"
                : "Juftlik tanlash"}
            </p>

            <p className="mt-0.5 text-[11px] leading-5 text-slate-400">
              {isComplete
                ? "Barcha elementlar uchun javob tanlandi."
                : "Chapdagi kartani tanlang, keyin o‘ng tomondagi mos javobni bosing."}
            </p>
          </div>
        </div>

        {selectedLeft !== null ||
        selectedRight !== null ? (
          <span className="shrink-0 rounded-xl bg-indigo-100 px-3 py-1.5 text-[11px] font-black text-indigo-600">
            Mos javobni tanlang
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Arrange words                                                              */
/* ========================================================================== */

function ArrangeQuestion({
  question,
  draft,
  onChange,
}: {
  question: Extract<
    TestSessionQuestion,
    { type: QuestionType.ARRANGE_WORDS }
  >;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
}) {
  const data =
    draft?.type === "arrange"
      ? draft.data
      : {};

  const selectedIds = Object.keys(data)
    .sort(
      (a, b) =>
        Number(a) - Number(b)
    )
    .map((key) => data[key]);

  const add = (id: number) => {
    if (selectedIds.includes(id)) return;

    onChange({
      type: "arrange",
      data: {
        ...data,
        [selectedIds.length]: id,
      },
    });
  };

  const remove = (index: number) => {
    const next: Record<
      string,
      number
    > = {};

    selectedIds
      .filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
      .forEach((id, itemIndex) => {
        next[String(itemIndex)] = id;
      });

    onChange({
      type: "arrange",
      data: next,
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600">
            Sizning tartibingiz
          </span>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  type: "arrange",
                  data: {},
                })
              }
              className="text-xs font-bold text-slate-500 transition hover:text-indigo-600"
            >
              Tozalash
            </button>
          )}
        </div>

        <div className="flex min-h-20 flex-wrap items-center gap-2">
          {selectedIds.length === 0 ? (
            <p className="w-full text-center text-sm text-slate-400">
              So‘zlarni quyidan tanlang
            </p>
          ) : (
            selectedIds.map(
              (id, index) => {
                const item =
                  question.items.find(
                    (word) =>
                      word.id === id
                  );

                if (!item) return null;

                return (
                  <button
                    key={`${id}-${index}`}
                    type="button"
                    onClick={() =>
                      remove(index)
                    }
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    <span className="flex size-5 items-center justify-center rounded-md bg-white/20 text-[10px]">
                      {index + 1}
                    </span>

                    {item.txt}

                    <X className="size-3.5" />
                  </button>
                );
              }
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {question.items.map((item) => {
          const selected =
            selectedIds.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              disabled={selected}
              onClick={() =>
                add(item.id)
              }
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-bold transition",
                selected
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              )}
            >
              {item.txt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Fill blanks                                                                */
/* ========================================================================== */

function FillBlankQuestion({
  question,
  draft,
  onChange,
}: {
  question: Extract<
    TestSessionQuestion,
    { type: QuestionType.FILL_BLANKS }
  >;
  draft?: AnswerDraft;
  onChange: (draft: AnswerDraft) => void;
}) {
  const data =
    draft?.type === "blanks"
      ? draft.data
      : {};

  return (
    <div className="space-y-4">
      {question.bl.map(
        (blank, index) => (
          <div
            key={blank.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-600">
              {index + 1}
            </span>

            <input
              type="text"
              value={
                data[String(blank.id)] ??
                ""
              }
              placeholder={`Bo‘sh joy ${blank.p}`}
              onChange={(event) =>
                onChange({
                  type: "blanks",
                  data: {
                    ...data,
                    [blank.id]:
                      event.target.value,
                  },
                })
              }
              className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        )
      )}
    </div>
  );
}

export default TestSessionPage;