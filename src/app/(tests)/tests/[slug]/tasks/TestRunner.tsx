"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, DoorOpen, Flag, Loader2 } from "lucide-react";

import { Ring } from "@/components/tests/Ring";
// Loyihangizdagi haqiqiy yo'lga moslang:
import { Question } from "@/components/question/Question";
import type {
  QuestionAnswerPayload,
  QuestionBackendResponse,
  QuestionSubmitResponse,
} from "@/lib/types/question";

import { ApiError, apiFetch } from "@/lib/api/tests/client";
import type { TaskData, TaskListResponse } from "@/lib/api/tests/types";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const toQuestion = (t: TaskData): QuestionBackendResponse =>
  ({
    id: t.id,
    txt: t.txt,
    instruction: t.ins,
    exp: null,
    type: t.qtype,
    choices: t.choices,
    items: t.items,
    pairs_left: t.pairs_left,
    pairs_right: t.pairs_right,
    blanks: t.blanks,
  }) as unknown as QuestionBackendResponse;

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function timeColor(left: number, total: number) {
  const r = total > 0 ? left / total : 0;
  if (left <= 60 || r <= 0.15) return "#f43f5e";
  if (r <= 0.4) return "#f59e0b";
  return "#10b981";
}

type Dialog = null | "exit" | "finish";

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export default function TestRunner({ slug }: { slug: string }) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [list, setList] = useState<TaskListResponse | null>(null);
  const [loadError, setLoadError] = useState<{ status: number; msg: string } | null>(null);

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [savedId, setSavedId] = useState<number | null>(null); // hozirgina saqlangan savol
  const [cache, setCache] = useState<Record<number, TaskData>>({});
  const [qError, setQError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const [deadline, setDeadline] = useState<number | null>(null);
  const [totalSec, setTotalSec] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [dialog, setDialog] = useState<Dialog>(null);
  const [finishing, setFinishing] = useState(false);

  const leaveOff = useRef(false);
  const pendingNav = useRef<(() => void) | null>(null);

  /* ---- savollar ro'yxati ---- */
  useEffect(() => {
    let on = true;
    apiFetch<TaskListResponse>(`${slug}/question`)
      .then((d) => {
        if (!on) return;
        setList(d);
        setAnswered(new Set(d.a));
        setDeadline(Date.now() + d.left * 1000);
        setTotalSec(d.left);
        const first = d.d.findIndex((q) => !d.a.includes(q.id));
        setIdx(first === -1 ? 0 : first);
      })
      .catch((e: ApiError) => on && setLoadError({ status: e.status, msg: e.message }));
    return () => {
      on = false;
    };
  }, [slug]);

  /* ---- taymer ---- */
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const left = deadline === null ? 0 : Math.max(0, Math.round((deadline - now) / 1000));

  /* ---- yakunlash ---- */
  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    setDialog(null);
    leaveOff.current = true;
    try {
      await apiFetch(`${slug}/finish`, { method: "POST", body: {} });
    } catch {
      // 403/409 — sessiya allaqachon yopilgan, baribir natijaga o'tamiz
    }
    router.replace(`/tests/${slug}?tab=natija`);
  }, [finishing, router, slug]);

  useEffect(() => {
    if (list && deadline !== null && left === 0) void finish();
  }, [list, deadline, left, finish]);

  /* ---- joriy savol ---- */
  const questions = list?.d ?? [];
  const qid = questions[idx]?.id;

  useEffect(() => {
    if (qid == null || cache[qid]) return;
    let on = true;
    setQError(null);
    apiFetch<{ left: number; d: TaskData }>(`${slug}/tasks/${qid}`)
      .then((r) => {
        if (!on) return;
        setCache((c) => ({ ...c, [qid]: r.d }));
        setDeadline(Date.now() + r.left * 1000); // serverga moslab turish
      })
      .catch((e: ApiError) => {
        if (!on) return;
        if (e.status === 409) void finish();
        else setQError(e.message);
      });
    return () => {
      on = false;
    };
  }, [slug, qid, cache, retry, finish]);

  // Keyingi savolni oldindan yuklash
  const nextId = questions[idx + 1]?.id;
  useEffect(() => {
    if (nextId == null || cache[nextId]) return;
    apiFetch<{ left: number; d: TaskData }>(`${slug}/tasks/${nextId}`)
      .then((r) => setCache((c) => (c[nextId] ? c : { ...c, [nextId]: r.d })))
      .catch(() => {});
  }, [slug, nextId, cache]);

  /* ---- navigatsiya ---- */
  const goTo = (i: number) => {
    if (i < 0 || i >= questions.length || i === idx) return;
    setDir(i > idx ? 1 : -1);
    setIdx(i);
    setSavedId(null);
    setNotice(null);
  };

  // Javob saqlangach (to'g'ri/noto'g'ri ko'rsatilmaydi) qisqa pauzadan so'ng keyingi savolga o'tadi
  useEffect(() => {
    if (savedId === null || questions[idx]?.id !== savedId || idx >= questions.length - 1) return;
    const t = setTimeout(() => goTo(idx + 1), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedId]);

  useEffect(() => {
    document.getElementById(`nav-${idx}`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [idx]);

  /* ---- javob yuborish ---- */
  // Test rejimi: to'g'ri/noto'g'ri darhol ko'rsatilmaydi (natija test tugagach e'lon qilinadi).
  // Komponentning ichki natija bloki chiqmasligi uchun promise hal bo'lmaydi: savol "saqlandi" holatiga o'tadi.
  const submitFor = (id: number) => async (payload: QuestionAnswerPayload): Promise<QuestionSubmitResponse> => {
    await apiFetch(`${slug}/tasks/${id}/answer`, { method: "POST", body: payload });
    setAnswered((s) => new Set(s).add(id));
    setSavedId(id);
    return new Promise<QuestionSubmitResponse>(() => {});
  };

  const onQuestionError = (err: unknown) => {
    const e = err as ApiError;
    if (e?.status === 409 && /yakunlangan|vaqti/i.test(e.message)) void finish();
    else if (e?.status === 409) {
      // bu savolga allaqachon javob berilgan
      if (qid != null) setAnswered((s) => new Set(s).add(qid));
      setNotice("Bu savolga allaqachon javob berilgan.");
    } else setNotice(e?.message || "Javobni yuborib bo‘lmadi. Qayta urinib ko‘ring.");
  };

  /* ---- sahifadan chiqishni to'sish ---- */
  useEffect(() => {
    if (!list) return;

    const onBefore = (e: BeforeUnloadEvent) => {
      if (leaveOff.current) return;
      e.preventDefault();
      e.returnValue = "";
    };

    const onClick = (e: MouseEvent) => {
      if (leaveOff.current || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      e.stopPropagation();
      pendingNav.current = () => router.push(url.pathname + url.search + url.hash);
      setDialog("exit");
    };

    const onPop = () => {
      if (leaveOff.current) return;
      history.pushState(null, "", location.href); // joyida ushlab turamiz
      pendingNav.current = () => router.push(`/tests/${slug}`);
      setDialog("exit");
    };

    history.pushState(null, "", location.href);
    window.addEventListener("beforeunload", onBefore);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", onBefore);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [list, router, slug]);

  const askExit = () => {
    pendingNav.current = () => router.push(`/tests/${slug}`);
    setDialog("exit");
  };

  const leaveLater = () => {
    leaveOff.current = true;
    setDialog(null);
    pendingNav.current?.();
  };

  /* ---- holatlar ---- */
  if (loadError) return <ErrorScreen slug={slug} err={loadError} />;
  if (!list) return <LoadingScreen />;

  const total = questions.length;
  const doneCount = answered.size;
  const unanswered = total - doneCount;
  const locked = qid != null && answered.has(qid);
  const justSaved = qid != null && savedId === qid;
  const current = qid != null ? cache[qid] : undefined;
  const color = timeColor(left, totalSec);
  const slide = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 36 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -36 }),
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-10">
      {/* ===== yuqori panel ===== */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={askExit}
            aria-label="Testdan chiqish"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <DoorOpen className="size-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">{list.title}</h1>
            <p className="text-xs text-slate-500">
              {doneCount} / {total} javob berilgan
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDialog("finish")}
            className="hidden h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 sm:flex"
          >
            <Flag className="size-4" /> Yakunlash
          </button>

          <Ring value={left} max={totalSec} size={52} stroke={11} color={color}>
            <span
              className={`text-[11px] font-black tabular-nums ${left <= 60 ? "animate-pulse text-rose-600" : "text-slate-800"}`}
            >
              {fmt(left)}
            </span>
          </Ring>
        </div>

        <div className="h-0.5 bg-slate-100">
          <motion.div
            className="h-full bg-amber-500"
            animate={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          {/* mobil navigator */}
          <div className="-mx-4 mb-4 overflow-x-auto px-4 lg:hidden">
            <div className="flex gap-2 pb-1">
              {questions.map((q, i) => (
                <NavDot key={q.id} i={i} active={i === idx} done={answered.has(q.id)} onClick={() => goTo(i)} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>
                Savol {idx + 1} / {total}
              </span>
              {qid != null && answered.has(qid) && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> Javob berilgan
                </span>
              )}
            </div>

            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={qid}
                custom={dir}
                variants={slide}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {qError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <p className="font-semibold">Savol yuklanmadi</p>
                    <p className="mt-1 text-xs">{qError}</p>
                    <button
                      type="button"
                      onClick={() => setRetry((n) => n + 1)}
                      className="mt-3 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Qayta urinish
                    </button>
                  </div>
                ) : !current ? (
                  <div className="space-y-3 py-2">
                    <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                    <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                  </div>
                ) : locked ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
                    <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                    <p className="mt-2 font-bold text-emerald-900">
                      {justSaved ? "Javob saqlandi" : "Bu savolga javob berilgan"}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Javobni o‘zgartirib bo‘lmaydi. To‘g‘ri javoblar test tugagach ko‘rinadi.
                    </p>
                  </div>
                ) : (
                  <Question
                    data={toQuestion(current)}
                    onAnswerSubmit={submitFor(current.id)}
                    onError={onQuestionError}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {notice && (
              <p role="alert" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                {notice}
              </p>
            )}
          </div>

          {/* pastki boshqaruv */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mx-auto flex max-w-6xl items-center gap-3 lg:max-w-none">
              <button
                type="button"
                onClick={() => goTo(idx - 1)}
                disabled={idx === 0}
                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ArrowLeft className="size-4" /> Oldingi
              </button>

              <button
                type="button"
                onClick={() => setDialog("finish")}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 sm:hidden"
              >
                <Flag className="size-4" /> Yakunlash
              </button>
              <span className="hidden flex-1 sm:block" />

              {idx < total - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(idx + 1)}
                  className={`flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition ${
                    qid != null && answered.has(qid)
                      ? "bg-amber-500 text-white hover:bg-amber-600"
                      : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}
                >
                  Keyingi <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialog("finish")}
                  className="flex h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Yakunlash <Flag className="size-4" />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ===== yon panel (desktop) ===== */}
        <aside className="hidden h-fit space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:block">
          <div className="flex items-center gap-4">
            <Ring value={doneCount} max={total} size={92} stroke={10} color="#f59e0b">
              <div className="text-center leading-tight">
                <div className="text-xl font-black tabular-nums text-slate-900">{doneCount}</div>
                <div className="text-[11px] font-semibold text-slate-400">/ {total}</div>
              </div>
            </Ring>
            <div className="text-sm">
              <p className="font-bold text-slate-900">Jarayon</p>
              <p className="mt-0.5 text-slate-500">{unanswered} ta savol qoldi</p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 border-t border-slate-100 pt-5">
            {questions.map((q, i) => (
              <NavDot key={q.id} i={i} active={i === idx} done={answered.has(q.id)} onClick={() => goTo(i)} />
            ))}
          </div>

          <div className="flex items-center gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <Legend className="bg-emerald-500" label="Javob berilgan" />
            <Legend className="bg-slate-200" label="Qolgan" />
          </div>
        </aside>
      </div>

      {/* ===== dialoglar ===== */}
      <AnimatePresence>
        {dialog && (
          <Modal onClose={() => setDialog(null)}>
            {dialog === "exit" ? (
              <>
                <Summary left={left} totalSec={totalSec} color={color} done={doneCount} total={total} />
                <h2 className="mt-5 text-lg font-black text-slate-900">Testdan chiqmoqchimisiz?</h2>
                <p className="mt-1.5 flex items-start gap-2 text-sm leading-6 text-slate-600">
                  <AlertTriangle className="mt-1 size-4 shrink-0 text-amber-500" />
                  Vaqt to‘xtamaydi. Chiqib ketsangiz ham taymer ishlashda davom etadi, vaqt tugasa test avtomatik yopiladi.
                </p>
                <div className="mt-6 grid gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setDialog(null)}
                    className="h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Testda qolish
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog("finish")}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Testni yakunlash
                  </button>
                  <button
                    type="button"
                    onClick={leaveLater}
                    className="h-10 text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-slate-800"
                  >
                    Keyinroq qaytaman
                  </button>
                </div>
              </>
            ) : (
              <>
                <Summary left={left} totalSec={totalSec} color={color} done={doneCount} total={total} />
                <h2 className="mt-5 text-lg font-black text-slate-900">Testni yakunlaysizmi?</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {unanswered > 0
                    ? `${unanswered} ta savolga hali javob bermadingiz. Yakunlagach javob berib bo‘lmaydi.`
                    : "Barcha savollarga javob berdingiz. Yakunlagach o‘zgartirib bo‘lmaydi."}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setDialog(null)}
                    className="h-11 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Davom etish
                  </button>
                  <button
                    type="button"
                    onClick={() => void finish()}
                    className="h-11 rounded-xl bg-amber-500 text-sm font-semibold text-white transition hover:bg-amber-600"
                  >
                    Yakunlash
                  </button>
                </div>
              </>
            )}
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finishing && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="size-8 animate-spin text-amber-500" />
            <p className="text-sm font-semibold text-slate-700">Javoblaringiz saqlanmoqda…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* kichik komponentlar                                                 */
/* ------------------------------------------------------------------ */

function NavDot({
  i,
  active,
  done,
  onClick,
}: {
  i: number;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`nav-${i}`}
      type="button"
      onClick={onClick}
      aria-label={`Savol ${i + 1}${done ? " (javob berilgan)" : ""}`}
      aria-current={active ? "step" : undefined}
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums transition ${
        active
          ? "bg-slate-900 text-white ring-4 ring-amber-200"
          : done
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {i + 1}
    </button>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function Summary({
  left,
  totalSec,
  color,
  done,
  total,
}: {
  left: number;
  totalSec: number;
  color: string;
  done: boolean | number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <Ring value={left} max={totalSec} size={84} stroke={10} color={color}>
          <span className="text-sm font-black tabular-nums text-slate-900">{fmt(left)}</span>
        </Ring>
        <span className="text-xs font-semibold text-slate-500">Qolgan vaqt</span>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <Ring value={Number(done)} max={total} size={84} stroke={10} color="#f59e0b">
          <span className="text-sm font-black tabular-nums text-slate-900">
            {Number(done)}/{total}
          </span>
        </Ring>
        <span className="text-xs font-semibold text-slate-500">Javoblar</span>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-500">
        <Loader2 className="size-5 animate-spin text-amber-500" />
        <span className="text-sm font-medium">Test yuklanmoqda…</span>
      </div>
    </main>
  );
}

function ErrorScreen({ slug, err }: { slug: string; err: { status: number; msg: string } }) {
  const finished = err.status === 409;
  const notStarted = err.status === 403;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="font-bold text-slate-900">
          {finished ? "Test yakunlangan" : notStarted ? "Test boshlanmagan" : "Testni yuklab bo‘lmadi"}
        </p>
        <p className="mt-1.5 text-sm text-slate-500">
          {notStarted ? "Avval test sahifasidan ro‘yxatdan o‘ting va testni boshlang." : err.msg}
        </p>
        <Link
          href={finished ? `/tests/${slug}?tab=natija` : `/tests/${slug}`}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
        >
          {finished ? "Natijani ko‘rish" : "Test sahifasiga qaytish"}
        </Link>
      </div>
    </main>
  );
}
