"use client";

import { backendRequest } from "@/lib/api/django/backend";

/**
 * console-panel.tsx
 *
 * Bitta fayl ichida to'liq konsol (tashqi API-helperlarsiz, fetch shu yerda):
 *   1. "Test namunalari" — namunalar + FOYDALANUVCHI TESTLARI (qo'shish/o'chirish,
 *      brauzerda saqlanadi, Run'ga `tc: [{i, o}]` bo'lib ketadi)
 *      (test yo'q bo'lsa "Konsol" — stdin kiritish)
 *   2. "Natija" — Run natijasi, interaktiv input, Submit SSE oqimi
 *   3. "Mening urinishlarim" — GET /api/problems/{slug}/submission
 *      Batafsil modal  — GET /api/user/submissions/{id}
 *
 * Backend QISQA kalitlar:
 *   run/execude : { r: [{i,s,in,ex,o,e,m,c,w,k}] } | { s: "input_required", o } | { s: "error", e }
 *   SSE         : t, i, s, in, ex, o, e, m, c, w | final: id, ok, v, p, n, tm, mm
 *   ro'yxat     : id, s, v, p, n, tm, mm, l:{id,n}, dt
 *   batafsil    : id, u, xp, pr:{id,t}, l:{id,n}, s, v, p, n, tm, mm, code, r:[...], dt
 *   `k: 1` — foydalanuvchi qo'shgan test natijasi.
 *
 * Eksport:
 *   ConsolePanel, useSubmitStream, useCustomTests, toWireTests,
 *   AttemptsTable, SubmissionDetailModal, MAX_CUSTOM_TESTS
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  History,
  Inbox,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Server,
  Terminal,
  X,
  XCircle,
  CornerDownLeft,
  type LucideIcon,
} from "lucide-react";
import type { TestCase } from "@/lib/problems/types";
import { formatMemory } from "@/lib/problems/utils";
import { cn } from "@/lib/utils";
import { useSSE } from "@/context/SSEContext";

// ============================================================
// SOZLAMALAR
// ============================================================

/** Submit natijasi shu vaqt ichida kelmasa — xato ko'rsatiladi. */
const STREAM_TIMEOUT_MS = 120_000;

/** Backend bilan bir xil chegaralar (views.py: MAX_CUSTOM_CASES / MAX_CUSTOM_LEN) */
export const MAX_CUSTOM_TESTS = 5;
const MAX_CUSTOM_LEN = 10_000;

const EVENT_NAMES = ["queued", "testcase", "final", "error"] as const;
type StreamEventType = (typeof EVENT_NAMES)[number];

// ============================================================
// TURLAR
// ============================================================

export type ConsoleTab = "testcase" | "result" | "attempts";
export type ResultMode = "run" | "submit" | null;

/** /run javobi — xom (qisqa yoki eski kalitlar bilan). */
export type RunWire = Record<string, any>;

interface CaseView {
  index: number;
  status: string;
  input?: string;
  expected?: string;
  output?: string;
  message?: string;
  cpu: number | null;
  memory: number | null;
  wall: number | null;
  /** foydalanuvchi qo'shgan test (backend: k: 1) */
  custom: boolean;
}

type RunView =
  | { kind: "cases"; cases: CaseView[] }
  | { kind: "input"; partial: string }
  | { kind: "error"; message: string };

interface FinalView {
  id?: number;
  ok: boolean;
  verdict: string;
  passed: number;
  total: number;
  time: number | null;
  memory: number | null;
}

type StreamPhase = "idle" | "connecting" | "queued" | "running" | "done" | "error";

export interface SubmitStreamState {
  phase: StreamPhase;
  taskId: string | null;
  cases: CaseView[];
  final?: FinalView;
  message?: string;
}

interface Attempt {
  id: number;
  ok: boolean;
  verdict: string;
  passed: number;
  total: number;
  time: number | null;
  memory: number | null;
  lang: string;
  date: string;
}

// ============================================================
// NORMALIZATSIYA (qisqa kalit <-> eski kalit)
// ============================================================

const str = (v: unknown): string =>
  typeof v === "string" ? v : v == null ? "" : String(v);

const num = (v: unknown): number | null => (typeof v === "number" ? v : null);

function normCase(d: Record<string, any>, fallbackIndex = 0): CaseView {
  return {
    index: d.i ?? d.index ?? d.idx ?? fallbackIndex,
    status: str(d.s ?? d.status ?? d.verdict ?? "RE"),
    input: d.in ?? d.input,
    expected: d.ex ?? d.expected_output ?? d.e_output ?? d.expected,
    output: d.o ?? d.output,
    message: d.e ?? d.message ?? d.stderr ?? undefined,
    cpu: num(d.c ?? d.cpu_time),
    memory: num(d.m ?? d.memory),
    wall: num(d.w ?? d.wall_time),
    custom: Boolean(d.k),
  };
}

function normalizeRun(raw: RunWire | null): RunView | null {
  if (!raw) return null;

  const s = raw.s ?? raw.status;
  if (s === "input_required") {
    return { kind: "input", partial: str(raw.o ?? raw.partial_output) };
  }
  if (s === "error") {
    return { kind: "error", message: str(raw.e ?? raw.message) };
  }

  const list: any[] | null = Array.isArray(raw.r)
    ? raw.r
    : Array.isArray(raw.results)
    ? raw.results
    : raw.r && typeof raw.r === "object"
    ? [raw.r]
    : null;

  if (list) {
    return { kind: "cases", cases: list.map((c, i) => normCase(c, i + 1)) };
  }
  if (raw.message) return { kind: "error", message: str(raw.message) };
  return null;
}

function normAttempt(d: Record<string, any>): Attempt {
  return {
    id: d.id,
    ok: Boolean(d.s),
    verdict: str(d.v),
    passed: d.p ?? 0,
    total: d.n ?? 0,
    time: num(d.tm),
    memory: num(d.mm),
    lang: str(d.l?.n ?? "—"),
    date: str(d.dt ?? "—"),
  };
}

interface DetailView {
  id: number;
  user: string;
  xp: number;
  problem: string;
  lang: string;
  ok: boolean;
  verdict: string;
  passed: number;
  total: number;
  time: number | null;
  memory: number | null;
  code: string;
  date: string;
  cases: CaseView[];
}

function normDetail(d: Record<string, any>): DetailView {
  const cases = (Array.isArray(d.r) ? d.r : []).map((c: any, i: number) => {
    const v = normCase(c, i + 1);
    // Yashirin testlarda input/expected bazaga yozilmaydi (bo'sh) — yashiramiz
    if (!v.input && !v.expected) {
      v.input = undefined;
      v.expected = undefined;
    }
    return v;
  });
  return {
    id: d.id,
    user: str(d.u),
    xp: d.xp ?? 0,
    problem: str(d.pr?.t),
    lang: str(d.l?.n ?? "—"),
    ok: Boolean(d.s),
    verdict: str(d.v),
    passed: d.p ?? 0,
    total: d.n ?? 0,
    time: num(d.tm),
    memory: num(d.mm),
    code: str(d.code),
    date: str(d.dt ?? "—"),
    cases,
  };
}

// ============================================================
// STATUS / VERDICT KONFIGURATSIYASI
// ============================================================

const TONES = {
  emerald: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400",
    chip: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  red: {
    card: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400",
    chip: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/50 dark:text-red-400",
    text: "text-red-600 dark:text-red-400",
  },
  amber: {
    card: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400",
    chip: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-400",
    text: "text-amber-600 dark:text-amber-400",
  },
  purple: {
    card: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-400",
    chip: "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-950/50 dark:text-purple-400",
    text: "text-purple-600 dark:text-purple-400",
  },
  orange: {
    card: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-400",
    chip: "bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/50 dark:text-orange-400",
    text: "text-orange-600 dark:text-orange-400",
  },
  neutral: {
    card: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300",
    chip: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300",
    text: "text-neutral-600 dark:text-neutral-400",
  },
} as const;

interface StatusMeta {
  label: string;
  uz: string;
  Icon: LucideIcon;
  tone: keyof typeof TONES;
}

const STATUS_META: Record<string, StatusMeta> = {
  AC: { label: "Accepted", uz: "Qabul qilindi", Icon: CheckCircle2, tone: "emerald" },
  WA: { label: "Wrong Answer", uz: "Noto'g'ri javob", Icon: XCircle, tone: "red" },
  TLE: { label: "Time Limit", uz: "Vaqt tugadi", Icon: Clock, tone: "amber" },
  MLE: { label: "Memory Limit", uz: "Xotira yetmadi", Icon: AlertTriangle, tone: "purple" },
  RE: { label: "Runtime Error", uz: "Ishga tushish xatosi", Icon: AlertTriangle, tone: "orange" },
  CE: { label: "Compile Error", uz: "Kompilyatsiya xatosi", Icon: Server, tone: "neutral" },
  SERVER: { label: "Server Error", uz: "Server xatosi", Icon: Server, tone: "neutral" },
};

const STATUS_ALIASES: Record<string, string> = {
  ACCEPTED: "AC",
  WRONG_ANSWER: "WA",
  TIME_LIMIT_EXCEEDED: "TLE",
  MEMORY_LIMIT_EXCEEDED: "MLE",
  RUNTIME_ERROR: "RE",
  COMPILE_ERROR: "CE",
  COMPILATION_ERROR: "CE",
  "SERVER ERROR": "SERVER",
  SERVER_ERROR: "SERVER",
};

function statusMeta(raw: string): StatusMeta {
  const key = raw.trim().toUpperCase();
  return (
    STATUS_META[key] ??
    STATUS_META[STATUS_ALIASES[key] ?? ""] ?? {
      ...STATUS_META.SERVER,
      label: raw || "Noma'lum",
      uz: raw || "Noma'lum",
    }
  );
}

const fmtMs = (v: number | null | undefined) =>
  v == null ? "—" : `${Math.round(v)} ms`;

// ============================================================
// FOYDALANUVCHI TESTLARI
// ============================================================

export interface CustomTest {
  id: string;
  input: string;
  output: string;
}

const newId = () => Math.random().toString(36).slice(2, 9);

/** Masala bo'yicha brauzerda (localStorage) saqlanadigan custom testlar. */
export function useCustomTests(problemId: number) {
  const storageKey = `custom-tests:${problemId}`;
  const [tests, setTests] = useState<CustomTest[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setTests(Array.isArray(parsed) ? parsed.slice(0, MAX_CUSTOM_TESTS) : []);
    } catch {
      setTests([]);
    }
  }, [storageKey]);

  const update = useCallback(
    (next: CustomTest[]) => {
      setTests(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* storage to'la yoki taqiqlangan */
      }
    },
    [storageKey]
  );

  return [tests, update] as const;
}

/**
 * Backend formatiga o'tkazadi: tc = [{ i: input, o: expected }].
 * Butunlay bo'sh testlar tashlab yuboriladi; `o` bo'sh bo'lsa umuman yuborilmaydi
 * (backend faqat ishga tushiradi, solishtirmaydi).
 */
export function toWireTests(tests: CustomTest[]): { i: string; o?: string }[] {
  return tests
    .filter((t) => t.input.trim() !== "" || t.output.trim() !== "")
    .slice(0, MAX_CUSTOM_TESTS)
    .map((t) => (t.output.trim() === "" ? { i: t.input } : { i: t.input, o: t.output }));
}

// ============================================================
// SUBMIT SSE HOOK
// ============================================================

const IDLE_STREAM: SubmitStreamState = {
  phase: "idle",
  taskId: null,
  cases: [],
};

function reduceStream(
  prev: SubmitStreamState,
  evt: { type: StreamEventType; data: Record<string, any> }
): SubmitStreamState {
  const d = evt.data;
  switch (evt.type) {
    case "queued":
      return { ...prev, phase: "queued" };
    case "testcase":
      return {
        ...prev,
        phase: "running",
        cases: [...prev.cases, normCase(d, prev.cases.length + 1)],
      };
    case "final":
      return {
        ...prev,
        phase: "done",
        final: {
          id: d.id ?? d.submission_id,
          ok: Boolean(d.ok ?? d.status),
          verdict: str(d.v ?? d.verdict ?? "WA"),
          passed: d.p ?? d.passed_test_count ?? 0,
          total: d.n ?? d.total_test_count ?? 0,
          time: num(d.tm ?? d.execution_time),
          memory: num(d.mm ?? d.execution_memory),
        },
      };
    case "error":
      return {
        ...prev,
        phase: "error",
        message: str(d.e ?? d.message ?? "Noma'lum xatolik"),
      };
  }
}

/**
 * Submit natijasi — loyihaning umumiy SSE ulanishi (SSEContext) orqali keladi,
 * bu hook o'zi EventSource OCHMAYDI, faqat `useSSE().subscribe` ga ulanadi.
 *
 * Ishlatish tartibi (CodeEditorPanel ichida):
 *
 *   stream.begin();                       // hodisalarni tinglashni boshlaydi (POST'dan OLDIN)
 *   const res = await submitCode(...);    // { t: "<task_id>" }
 *   stream.track(res.t);                  // faqat shu task_id'ning hodisalari qabul qilinadi
 *   // xatolik bo'lsa: stream.fail("xabar")
 *
 * Worker POST javobidan oldin hodisa yuborib qo'ysa ham u yo'qolmaydi:
 * `t` noma'lum paytda kelgan hodisalar buferda turadi va `track(t)` da
 * qayta ishlanadi. Boshqa task'lar (`t` mos kelmasa) va `xp` kabi hodisalar
 * e'tiborga olinmaydi.
 */
export function useSubmitStream() {
  const { subscribe } = useSSE();
  // SSEProvider `subscribe` ni har renderda yangidan yaratadi — ref orqali olamiz
  const subscribeRef = useRef(subscribe);
  subscribeRef.current = subscribe;

  const [state, setState] = useState<SubmitStreamState>(IDLE_STREAM);

  const unsubsRef = useRef<(() => void)[]>([]);
  const taskRef = useRef<string | null>(null);
  const bufferRef = useRef<{ type: StreamEventType; data: Record<string, any> }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const teardown = useCallback(() => {
    unsubsRef.current.forEach((off) => off());
    unsubsRef.current = [];
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const armTimeout = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState((p) =>
        p.phase === "done" || p.phase === "error"
          ? p
          : {
              ...p,
              phase: "error",
              message: "Natija kelmadi. Keyinroq «Mening urinishlarim» bo'limini tekshiring.",
            }
      );
      teardown();
    }, STREAM_TIMEOUT_MS);
  }, [teardown]);

  const apply = useCallback(
    (evt: { type: StreamEventType; data: Record<string, any> }) => {
      setState((p) => reduceStream(p, evt));
      if (evt.type === "final" || evt.type === "error") {
        teardown();
      } else {
        armTimeout();
      }
    },
    [teardown, armTimeout]
  );

  const begin = useCallback(() => {
    teardown();
    taskRef.current = null;
    bufferRef.current = [];
    setState({ ...IDLE_STREAM, phase: "connecting" });

    unsubsRef.current = EVENT_NAMES.map((type) =>
      subscribeRef.current(type, (data: unknown) => {
        // SSEProvider "error" nomini ulanish xatosi uchun ham ishlatadi
        // (u holda data = undefined) — faqat haqiqiy obyektlarni qabul qilamiz.
        if (!data || typeof data !== "object") return;
        const evt = { type, data: data as Record<string, any> };

        if (taskRef.current === null) {
          bufferRef.current.push(evt);
          return;
        }
        if (evt.data.t !== taskRef.current) return;
        apply(evt);
      })
    );
  }, [teardown, apply]);

  const track = useCallback(
    (taskId: string) => {
      taskRef.current = taskId;
      setState((p) => ({
        ...p,
        taskId,
        phase: p.phase === "connecting" ? "queued" : p.phase,
      }));
      armTimeout();

      const buffered = bufferRef.current;
      bufferRef.current = [];
      buffered.filter((e) => e.data.t === taskId).forEach(apply);
    },
    [apply, armTimeout]
  );

  const fail = useCallback(
    (message: string) => {
      teardown();
      setState({ ...IDLE_STREAM, phase: "error", message });
    },
    [teardown]
  );

  const reset = useCallback(() => {
    teardown();
    taskRef.current = null;
    bufferRef.current = [];
    setState(IDLE_STREAM);
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  const active =
    state.phase === "connecting" ||
    state.phase === "queued" ||
    state.phase === "running";

  return { state, active, begin, track, fail, reset };
}

// ============================================================
// ASOSIY KOMPONENT
// ============================================================

interface ConsolePanelProps {
  slug: string;
  /** problem.sampleTests */
  exam: TestCase[];
  activeTab: ConsoleTab;
  onTabChange: (tab: ConsoleTab) => void;

  mode: ResultMode;
  runResult: RunWire | null;
  isRunning: boolean;

  stream: SubmitStreamState;
  isSubmitting: boolean;

  error: string | null;

  /** Foydalanuvchi testlari (useCustomTests) */
  customTests: CustomTest[];
  onCustomTestsChange: (tests: CustomTest[]) => void;

  /** Konsol rejimi (test yo'q): stdin matni */
  stdin: string;
  onStdinChange: (value: string) => void;
  /** Dastur qo'shimcha input so'raganda foydalanuvchi bitta qator kiritadi */
  onProvideInput: (line: string) => void;
}

export function ConsolePanel({
  slug,
  exam,
  activeTab,
  onTabChange,
  mode,
  runResult,
  isRunning,
  stream,
  isSubmitting,
  error,
  customTests,
  onCustomTestsChange,
  stdin,
  onStdinChange,
  onProvideInput,
}: ConsolePanelProps) {
  const [detailId, setDetailId] = useState<number | null>(null);

  const consoleMode = exam.length === 0;
  const runView = useMemo(() => normalizeRun(runResult), [runResult]);

  // Natija tabidagi indikator rangi
  const resultTone: keyof typeof TONES | null = useMemo(() => {
    if (mode === "submit" && stream.phase === "done" && stream.final) {
      return stream.final.ok ? "emerald" : "red";
    }
    if (mode === "run" && runView?.kind === "cases" && runView.cases.length > 0) {
      return runView.cases.every((c) => c.status.toUpperCase() === "AC")
        ? "emerald"
        : "red";
    }
    if (mode === "run" && runView?.kind === "error") return "red";
    return null;
  }, [mode, stream, runView]);

  const busy = isRunning || isSubmitting;

  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#0f172a]">
      {/* Tablar */}
      <div className="flex shrink-0 items-center overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
        <TabButton
          active={activeTab === "testcase"}
          onClick={() => onTabChange("testcase")}
          icon={<Terminal className="size-3.5" />}
          label={consoleMode ? "Konsol" : "Test namunalari"}
        />
        <TabButton
          active={activeTab === "result"}
          onClick={() => onTabChange("result")}
          icon={<Play className="size-3.5" />}
          label="Natija"
          trailing={
            busy ? (
              <Loader2 className="size-3 animate-spin text-orange-500" />
            ) : resultTone ? (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  resultTone === "emerald" ? "bg-emerald-500" : "bg-red-500"
                )}
              />
            ) : null
          }
        />
        <TabButton
          active={activeTab === "attempts"}
          onClick={() => onTabChange("attempts")}
          icon={<History className="size-3.5" />}
          label="Mening urinishlarim"
        />
      </div>

      {/* Kontent */}
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {activeTab === "testcase" &&
          (consoleMode ? (
            <ConsoleInputTab stdin={stdin} onChange={onStdinChange} />
          ) : (
            <TestsTab
              exam={exam}
              customTests={customTests}
              onChange={onCustomTestsChange}
            />
          ))}

        {activeTab === "result" && (
          <ResultTab
            mode={mode}
            runView={runView}
            isRunning={isRunning}
            isSubmitting={isSubmitting}
            stream={stream}
            error={error}
            consoleMode={consoleMode}
            stdin={stdin}
            onProvideInput={onProvideInput}
            onOpenDetail={setDetailId}
          />
        )}

        {activeTab === "attempts" && (
          <AttemptsTable slug={slug} onOpen={setDetailId} />
        )}
      </div>

      <SubmissionDetailModal
        submissionId={detailId}
        open={detailId !== null}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

// ============================================================
// KICHIK UI QISMLARI
// ============================================================

function TabButton({
  active,
  onClick,
  icon,
  label,
  trailing,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-medium transition-colors",
        active
          ? "border-orange-500 text-orange-600 dark:text-orange-500"
          : "border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      )}
    >
      {icon}
      {label}
      {trailing}
    </button>
  );
}

function Spinner({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-neutral-400">
      <div className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-orange-500" />
      <p className="text-xs">{label}</p>
      {hint && <p className="text-[10px]">{hint}</p>}
    </div>
  );
}

function EmptyState({
  icon,
  text,
  hint,
}: {
  icon: ReactNode;
  text: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-neutral-400">
      <div className="opacity-50">{icon}</div>
      <p className="text-sm">{text}</p>
      {hint && <p className="text-xs text-neutral-400/80">{hint}</p>}
    </div>
  );
}

function ErrorBox({ title = "Xatolik", message }: { title?: string; message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/50 dark:bg-red-950/30">
      <p className="text-xs font-medium text-red-600 dark:text-red-400">{title}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-red-500 dark:text-red-300">
        {message}
      </p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard ruxsat berilmagan */
        }
      }}
      className="text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
      aria-label="Nusxa olish"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <Copy className="size-3.5" />
      )}
    </button>
  );
}

function Field({
  label,
  value,
  highlight,
  copyable,
}: {
  label: string;
  value: string;
  highlight?: "success" | "error";
  copyable?: boolean;
}) {
  const bg =
    highlight === "success"
      ? "bg-emerald-100/50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      : highlight === "error"
      ? "bg-red-100/50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      : "bg-white/60 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300";

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
          {label}
        </span>
        {copyable && <CopyButton text={value} />}
      </div>
      <pre
        className={cn(
          "mt-0.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded p-2 font-mono text-[11px]",
          bg
        )}
      >
        {value === "" ? "(bo'sh)" : value}
      </pre>
    </div>
  );
}

// ============================================================
// 1) TEST NAMUNALARI / KONSOL INPUT
// ============================================================

function TestsTab({
  exam,
  customTests,
  onChange,
}: {
  exam: TestCase[];
  customTests: CustomTest[];
  onChange: (tests: CustomTest[]) => void;
}) {
  const [active, setActive] = useState(0);
  const total = exam.length + customTests.length;
  const idx = Math.min(active, Math.max(total - 1, 0));
  const isCustom = idx >= exam.length;
  const sample = isCustom ? null : exam[idx];
  const custom = isCustom ? customTests[idx - exam.length] : null;

  const add = () => {
    if (customTests.length >= MAX_CUSTOM_TESTS) return;
    onChange([...customTests, { id: newId(), input: "", output: "" }]);
    setActive(exam.length + customTests.length);
  };

  const remove = (id: string) => {
    onChange(customTests.filter((t) => t.id !== id));
    setActive((a) => Math.max(0, Math.min(a, total - 2)));
  };

  const patch = (id: string, p: Partial<CustomTest>) =>
    onChange(customTests.map((t) => (t.id === id ? { ...t, ...p } : t)));

  const tabBase =
    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors";
  const tabOn =
    "bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900";
  const tabOff =
    "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {exam.map((tc, i) => (
          <button
            key={tc.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(tabBase, idx === i ? tabOn : tabOff)}
          >
            Test {i + 1}
          </button>
        ))}

        {customTests.map((t, i) => {
          const pos = exam.length + i;
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-1 rounded-md pr-1 transition-colors",
                idx === pos ? tabOn : tabOff
              )}
            >
              <button
                type="button"
                onClick={() => setActive(pos)}
                className="py-1.5 pl-3 text-xs font-medium"
              >
                Test {pos + 1}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Testni o'chirish"
                className="flex size-4 items-center justify-center rounded opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })}

        {customTests.length < MAX_CUSTOM_TESTS && (
          <button
            type="button"
            onClick={add}
            title="O'z testingizni qo'shish"
            aria-label="Test qo'shish"
            className="flex size-7 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <Plus className="size-4" />
          </button>
        )}

        {customTests.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onChange([]);
              setActive(0);
            }}
            className="ml-auto flex items-center gap-1 text-[11px] text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <RotateCcw className="size-3" />
            Testlarni tiklash
          </button>
        )}
      </div>

      {sample && (
        <div className="space-y-3">
          <LabeledPre label="Kirish (input)" value={sample.input} />
          <LabeledPre label="Kutilgan chiqish (output)" value={sample.output} />
          {sample.explanation && (
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                Izoh:
              </span>{" "}
              {sample.explanation}
            </p>
          )}
        </div>
      )}

      {custom && (
        <div className="space-y-3">
          <CustomArea
            label="Kirish (input.txt)"
            value={custom.input}
            placeholder="Test uchun input..."
            onChange={(v) => patch(custom.id, { input: v })}
          />
          <CustomArea
            label="Chiqish (output.txt) — ixtiyoriy"
            value={custom.output}
            placeholder="Kutilgan natija (bo'sh qoldirsangiz, kod faqat ishga tushiriladi)"
            onChange={(v) => patch(custom.id, { output: v })}
          />
          <p className="text-[11px] text-neutral-400">
            Bu test faqat «Yuritish» bilan ishlaydi va brauzeringizda saqlanadi.
            «Yuborish» uni hisobga olmaydi.
          </p>
        </div>
      )}
    </div>
  );
}

function CustomArea({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      <textarea
        value={value}
        maxLength={MAX_CUSTOM_LEN}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        rows={3}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      />
    </div>
  );
}

function LabeledPre({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <pre className="overflow-x-auto rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
        {value}
      </pre>
    </div>
  );
}

function ConsoleInputTab({
  stdin,
  onChange,
}: {
  stdin: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          Kirish (stdin)
        </span>
        {stdin && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="flex items-center gap-1 text-[11px] text-neutral-400 transition-colors hover:text-neutral-600"
          >
            <RotateCcw className="size-3" />
            Tozalash
          </button>
        )}
      </div>
      <textarea
        value={stdin}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        placeholder="Dastur o'qiydigan ma'lumotni shu yerga yozing (har qator — alohida input)"
        className="min-h-24 flex-1 resize-none rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
      />
      <p className="text-[11px] leading-relaxed text-neutral-400">
        Bu masalada test yo'q — kod erkin rejimda ishlaydi. Dastur qo'shimcha
        input so'rasa, «Natija» bo'limida yangi qator kiritishingiz mumkin.
      </p>
    </div>
  );
}

// ============================================================
// 2) NATIJA
// ============================================================

function ResultTab({
  mode,
  runView,
  isRunning,
  isSubmitting,
  stream,
  error,
  consoleMode,
  stdin,
  onProvideInput,
  onOpenDetail,
}: {
  mode: ResultMode;
  runView: RunView | null;
  isRunning: boolean;
  isSubmitting: boolean;
  stream: SubmitStreamState;
  error: string | null;
  consoleMode: boolean;
  stdin: string;
  onProvideInput: (line: string) => void;
  onOpenDetail: (id: number) => void;
}) {
  if (error && !isRunning && !isSubmitting) {
    return <ErrorBox message={error} />;
  }

  if (mode === "submit") {
    return <SubmitView stream={stream} onOpenDetail={onOpenDetail} />;
  }

  // Run — birinchi yuklanish
  if (isRunning && !runView) {
    return <Spinner label="Kod ishga tushirilmoqda..." />;
  }

  if (mode === "run" && runView) {
    return (
      <div className="relative">
        {isRunning && (
          <div className="absolute inset-x-0 -top-4 h-0.5 overflow-hidden bg-orange-100">
            <div className="h-full w-1/3 animate-pulse bg-orange-500" />
          </div>
        )}

        {runView.kind === "error" && <ErrorBox message={runView.message} />}

        {runView.kind === "input" && (
          <InputPrompt
            partial={runView.partial}
            stdin={stdin}
            disabled={isRunning}
            onSubmit={onProvideInput}
          />
        )}

        {runView.kind === "cases" && (
          <RunCases cases={runView.cases} consoleMode={consoleMode} />
        )}
      </div>
    );
  }

  return (
    <EmptyState
      icon={<CheckCircle2 className="size-9" />}
      text="Kodingizni ishga tushirib natijani ko'ring."
    />
  );
}

function RunCases({
  cases,
  consoleMode,
}: {
  cases: CaseView[];
  consoleMode: boolean;
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-8" />}
        text="Namuna testlar topilmadi"
        hint="«Yuborish» tugmasi orqali to'liq tekshiring"
      />
    );
  }

  const failed = cases.filter((c) => c.status.toUpperCase() !== "AC").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold">
        {failed === 0 ? (
          <span className="flex items-center gap-1.5 text-emerald-600">
            <CheckCircle2 className="size-4" />
            {consoleMode
              ? "Dastur muvaffaqiyatli bajarildi"
              : `Barcha testlar o'tdi (${cases.length}/${cases.length})`}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-red-600">
            <XCircle className="size-4" />
            {consoleMode ? "Dasturda xatolik" : `${failed} ta testda xato`}
          </span>
        )}
      </div>

      {cases.map((c) => (
        <CaseCard
          key={`${c.custom ? "c" : "s"}-${c.index}`}
          c={c}
          showExpected={!consoleMode}
          forceShow
        />
      ))}
    </div>
  );
}

const GRID_COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

function CaseCard({
  c,
  showExpected = true,
  forceShow = false,
}: {
  c: CaseView;
  showExpected?: boolean;
  /** true bo'lsa (Run natijasi) hech qachon "yashirin test" deb ko'rsatilmaydi */
  forceShow?: boolean;
}) {
  const meta = statusMeta(c.status);
  const tone = TONES[meta.tone];
  const ok = c.status.toUpperCase() === "AC";
  const hidden = !forceShow && c.input === undefined && c.expected === undefined;
  const hasExpected = showExpected && c.expected !== undefined;
  const cols = 1 + (c.input !== undefined ? 1 : 0) + (hasExpected ? 1 : 0);

  return (
    <div className={cn("rounded-lg border p-3", tone.card)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <meta.Icon className="size-4 shrink-0" />
          <span className="text-xs font-semibold">
            {c.custom ? `Custom #${c.index}` : `Test #${c.index}`} — {meta.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs opacity-80">
          {c.cpu != null && <span className="tabular-nums">{fmtMs(c.cpu)}</span>}
          {c.memory != null && (
            <span className="tabular-nums">{formatMemory(c.memory)}</span>
          )}
        </div>
      </div>

      {hidden ? (
        <p className="text-[11px] opacity-80">
          Yashirin test — input va kutilgan natija ko'rsatilmaydi.
        </p>
      ) : (
        <div className={cn("grid grid-cols-1 gap-2", GRID_COLS[cols])}>
          {c.input !== undefined && <Field label="Input" value={c.input} />}
          {hasExpected && <Field label="Kutilgan" value={c.expected!} />}
          <Field
            label="Sizning javob"
            value={c.output ?? ""}
            highlight={ok ? "success" : "error"}
          />
        </div>
      )}

      {hidden && c.output !== undefined && (
        <div className="mt-2">
          <Field label="Sizning javob" value={c.output} highlight="error" />
        </div>
      )}

      {c.message && (
        <div className="mt-2 rounded bg-white/60 p-2 dark:bg-neutral-900">
          <p className="whitespace-pre-wrap break-words font-mono text-[11px] text-red-600 dark:text-red-400">
            {c.message}
          </p>
        </div>
      )}
    </div>
  );
}

/** Interaktiv input: dastur EOF'ga yetganda yangi qator so'raydi. */
function InputPrompt({
  partial,
  stdin,
  disabled,
  onSubmit,
}: {
  partial: string;
  stdin: string;
  disabled: boolean;
  onSubmit: (line: string) => void;
}) {
  const [line, setLine] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) inputRef.current?.focus();
  }, [disabled, partial]);

  const send = () => {
    if (disabled) return;
    onSubmit(line);
    setLine("");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
          Dastur qo'shimcha input kutmoqda
        </p>
        <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-300">
          Quyiga yangi qator yozib Enter bosing.
        </p>
      </div>

      {partial && <Field label="Hozirgacha chiqqan natija" value={partial} />}
      {stdin.trim() && <Field label="Kiritilgan input" value={stdin} />}

      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 focus-within:border-orange-500 dark:border-neutral-800 dark:bg-neutral-900">
        <ChevronRight className="size-4 shrink-0 text-orange-500" />
        <input
          ref={inputRef}
          value={line}
          disabled={disabled}
          onChange={(e) => setLine(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          spellCheck={false}
          placeholder="Input kiriting..."
          className="min-w-0 flex-1 bg-transparent font-mono text-xs text-neutral-800 outline-none placeholder:text-neutral-400 disabled:opacity-50 dark:text-neutral-200"
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled}
          className="flex shrink-0 items-center gap-1 rounded-md bg-orange-500 px-2 py-1 text-[11px] font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {disabled ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <CornerDownLeft className="size-3" />
          )}
          Yuborish
        </button>
      </div>
    </div>
  );
}

// ---------- Submit (SSE) ----------

function SubmitView({
  stream,
  onOpenDetail,
}: {
  stream: SubmitStreamState;
  onOpenDetail: (id: number) => void;
}) {
  const { phase, cases, final, message } = stream;
  const [expanded, setExpanded] = useState<number | null>(null);

  // yangi submit boshlanganda ochiq kartani yopamiz
  useEffect(() => {
    if (phase === "connecting") setExpanded(null);
  }, [phase]);

  if (phase === "idle") {
    return (
      <EmptyState
        icon={<CheckCircle2 className="size-9" />}
        text="Yechimni yuborib natijani kuting."
      />
    );
  }

  const inProgress = phase === "connecting" || phase === "queued" || phase === "running";
  const expandedCase = cases.find((c) => c.index === expanded);

  return (
    <div className="space-y-4">
      {/* Holat bannerlari */}
      {inProgress && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Loader2 className="size-4 animate-spin text-orange-500" />
          {phase === "running"
            ? `Tekshirilmoqda... ${cases.length}-test`
            : "Navbatda kutilmoqda..."}
        </div>
      )}

      {phase === "error" && (
        <ErrorBox title="Yuborishda xatolik" message={message ?? "Noma'lum xatolik"} />
      )}

      {phase === "done" && final && <FinalBanner final={final} onOpenDetail={onOpenDetail} />}

      {/* Testlar to'ri */}
      {(cases.length > 0 || inProgress) && (
        <div className="flex flex-wrap gap-2">
          {cases.map((c) => {
            const meta = statusMeta(c.status);
            const isOpen = expanded === c.index;
            return (
              <button
                key={c.index}
                type="button"
                onClick={() => setExpanded(isOpen ? null : c.index)}
                title={`Test #${c.index} — ${meta.label}`}
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg text-xs font-bold transition-all",
                  TONES[meta.tone].chip,
                  isOpen && "ring-2 ring-orange-400 ring-offset-1"
                )}
              >
                {c.index}
              </button>
            );
          })}
          {inProgress && (
            <span className="flex size-8 animate-pulse items-center justify-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
              <Loader2 className="size-3.5 animate-spin" />
            </span>
          )}
        </div>
      )}

      {expandedCase && <CaseCard c={expandedCase} />}

      {phase === "done" && final && !final.ok && cases.length > 0 && (
        <p className="text-[11px] text-neutral-400">
          Tekshiruv birinchi xato testda to'xtatildi.
        </p>
      )}
    </div>
  );
}

function FinalBanner({
  final,
  onOpenDetail,
}: {
  final: FinalView;
  onOpenDetail: (id: number) => void;
}) {
  const meta = statusMeta(final.ok ? "AC" : final.verdict);
  const tone = TONES[meta.tone];
  const pct = final.total > 0 ? Math.round((final.passed / final.total) * 100) : 0;

  return (
    <div className={cn("rounded-xl border p-4", tone.card)}>
      <div className="flex flex-wrap items-center gap-3">
        <meta.Icon className="size-6 shrink-0" />
        <div className="min-w-0">
          <p className="text-base font-bold">{meta.label}</p>
          <p className="text-xs opacity-80">
            {final.passed}/{final.total} ta test o'tdi
          </p>
        </div>

        <div className="ml-auto flex items-center gap-4 text-xs">
          <div className="text-right">
            <p className="text-[10px] uppercase opacity-60">Vaqt</p>
            <p className="font-semibold tabular-nums">{fmtMs(final.time)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase opacity-60">Xotira</p>
            <p className="font-semibold tabular-nums">
              {final.memory != null ? formatMemory(final.memory) : "—"}
            </p>
          </div>
          {final.id != null && (
            <button
              type="button"
              onClick={() => onOpenDetail(final.id!)}
              className="rounded-md border border-current/20 bg-white/60 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-white dark:bg-neutral-900/60"
            >
              Batafsil
            </button>
          )}
        </div>
      </div>

      {final.total > 0 && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/60 dark:bg-neutral-900/60">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              final.ok ? "bg-emerald-500" : "bg-red-400"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3) MENING URINISHLARIM  (+ Batafsil modal)
// ============================================================

export const attemptsKeyOf = (slug: string) =>
  `/api/problems/${slug}/submission?limit=10`;

const detailKeyOf = (id: number) => `/api/user/submissions/${id}`;

const jsonFetcher = async (url: string) => {
  const res = await backendRequest(url, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(String(res.status)) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
};

/** Masala bo'yicha foydalanuvchining oxirgi taqdimotlari jadvali. */
export function AttemptsTable({
  slug,
  onOpen,
  refreshInterval = 0,
}: {
  slug: string;
  onOpen: (id: number) => void;
  refreshInterval?: number;
}) {
  const { subscribe } = useSSE();
  const { data, error, isLoading, mutate } = useSWR(attemptsKeyOf(slug), jsonFetcher, {
    revalidateOnFocus: false,
    refreshInterval,
  });

  // Yangi taqdimot tekshiruvi tugashi bilan ("final") ro'yxat o'zi yangilanadi —
  // polling kerak emas, boshqa tabdan yuborilgan yechim ham ko'rinadi.
  useEffect(() => subscribe("final", () => mutate()), [subscribe, mutate]);

  const attempts: Attempt[] = useMemo(
    () => (Array.isArray(data?.data) ? data.data.map(normAttempt) : []),
    [data]
  );

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-10 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <AlertTriangle className="size-7 text-neutral-300" />
        <p className="text-sm text-neutral-500">Urinishlarni yuklab bo'lmadi</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <RotateCcw className="size-3.5" />
          Qayta urinish
        </button>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="size-8" />}
        text="Hali hech qanday yechim yubormadingiz"
        hint="«Yuborish» tugmasini bosing — tarix shu yerda ko'rinadi"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px] text-sm">
        <div className="grid grid-cols-12 gap-2 border-b border-neutral-100 px-2 pb-2 text-[10px] font-medium uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
          <span className="col-span-2">#</span>
          <span className="col-span-3">Holat</span>
          <span className="col-span-2">Til</span>
          <span className="col-span-1 text-right">Vaqt</span>
          <span className="col-span-2 text-right">Xotira</span>
          <span className="col-span-2 text-right">Sana</span>
        </div>

        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {attempts.map((a) => {
            const meta = statusMeta(a.ok ? "AC" : a.verdict || "WA");
            return (
              <li
                key={a.id}
                onClick={() => onOpen(a.id)}
                className="grid cursor-pointer grid-cols-12 items-center gap-2 px-2 py-2.5 text-xs transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <span className="col-span-2 font-medium tabular-nums text-blue-600 dark:text-blue-400">
                  {a.id}
                </span>
                <span
                  className={cn("col-span-3 truncate font-medium", TONES[meta.tone].text)}
                  title={`${a.passed}/${a.total} ta test`}
                >
                  {meta.uz}
                </span>
                <span className="col-span-2 truncate text-neutral-600 dark:text-neutral-300">
                  {a.lang}
                </span>
                <span className="col-span-1 text-right tabular-nums text-neutral-500">
                  {fmtMs(a.time)}
                </span>
                <span className="col-span-2 text-right tabular-nums text-neutral-500">
                  {a.memory != null ? formatMemory(a.memory) : "—"}
                </span>
                <span className="col-span-2 text-right tabular-nums text-neutral-400">
                  {a.date}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const DETAIL_ERRORS: Record<number, string> = {
  401: "Tizimga kiring",
  403: "Bu ma'lumotni ko'rish huquqingiz yo'q",
  404: "Taqdimot topilmadi",
};

/** Taqdimot tafsilotlari: GET /api/user/submissions/{id} */
export function SubmissionDetailModal({
  submissionId,
  open,
  onClose,
}: {
  submissionId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  const { data, error, isLoading } = useSWR(
    open && submissionId ? detailKeyOf(submissionId) : null,
    jsonFetcher,
    { revalidateOnFocus: false }
  );
  const sub = useMemo(() => (data ? normDetail(data) : null), [data]);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return;
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const errStatus = (error as { status?: number } | undefined)?.status;
  const meta = sub ? statusMeta(sub.ok ? "AC" : sub.verdict || "WA") : null;
  const pct = sub && sub.total > 0 ? Math.round((sub.passed / sub.total) * 100) : 0;
  const expandedCase = sub?.cases.find((c) => c.index === expanded);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#0f172a]">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Taqdimot #{submissionId}
            </h2>
            <p className="truncate text-xs text-neutral-400">
              {sub?.problem || (isLoading ? "Yuklanmoqda..." : "")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="flex size-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isLoading && (
            <div className="flex h-48 flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="size-6 animate-spin text-orange-500" />
              <p className="text-sm">Ma'lumotlar yuklanmoqda...</p>
            </div>
          )}

          {error && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
              <AlertTriangle className="size-10 text-red-300" />
              <p className="text-sm font-medium text-red-600">
                {DETAIL_ERRORS[errStatus ?? 0] ?? "Ma'lumotlarni yuklashda xatolik"}
              </p>
            </div>
          )}

          {sub && meta && (
            <div className="space-y-5">
              {/* Banner */}
              <div
                className={cn(
                  "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
                  TONES[meta.tone].card
                )}
              >
                <div className="flex items-center gap-3">
                  <meta.Icon className="size-5 shrink-0" />
                  <div>
                    <p className="text-lg font-bold">{meta.label}</p>
                    <p className="text-xs opacity-80">
                      {sub.passed}/{sub.total} ta test o'tdi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm sm:ml-auto sm:text-right">
                  <Stat label="Vaqt" value={fmtMs(sub.time)} />
                  <Stat
                    label="Xotira"
                    value={sub.memory != null ? formatMemory(sub.memory) : "—"}
                  />
                  <Stat label="Til" value={sub.lang} />
                </div>
              </div>

              {sub.total > 0 && (
                <div>
                  <div className="mb-1 flex justify-between text-xs text-neutral-500">
                    <span>Testlar natijasi</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        sub.passed === sub.total ? "bg-emerald-500" : "bg-red-400"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetaCard label="Foydalanuvchi" value={sub.user || "—"} />
                <MetaCard label="XP" value={`+${sub.xp}`} />
                <MetaCard label="Sana" value={sub.date} />
                <MetaCard
                  label="Verdict"
                  value={sub.verdict || (sub.ok ? "AC" : "WA")}
                  tone={sub.ok ? "emerald" : "red"}
                />
              </div>

              {/* Kod */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    <Terminal className="size-4" />
                    Yuborilgan kod
                  </h3>
                  {sub.code && <CopyButton text={sub.code} />}
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-neutral-200 bg-neutral-900 p-4 font-mono text-xs leading-relaxed text-neutral-100 dark:border-neutral-800">
                  <code>{sub.code || "Kod mavjud emas"}</code>
                </pre>
              </div>

              {/* Test natijalari */}
              {sub.cases.length > 0 && (
                <div className="space-y-3">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    <Bug className="size-4 text-orange-500" />
                    Test natijalari
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    {sub.cases.map((c) => {
                      const m = statusMeta(c.status);
                      return (
                        <button
                          key={c.index}
                          type="button"
                          onClick={() =>
                            setExpanded((p) => (p === c.index ? null : c.index))
                          }
                          title={`Test #${c.index} — ${m.label}`}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg text-xs font-bold transition-all",
                            TONES[m.tone].chip,
                            expanded === c.index && "ring-2 ring-orange-400 ring-offset-1"
                          )}
                        >
                          {c.index}
                        </button>
                      );
                    })}
                  </div>

                  {expandedCase && <CaseCard c={expandedCase} />}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase opacity-60">{label}</p>
      <p className="font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MetaCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-semibold",
          tone ? TONES[tone].text : "text-neutral-800 dark:text-neutral-100"
        )}
      >
        {value}
      </p>
    </div>
  );
}
