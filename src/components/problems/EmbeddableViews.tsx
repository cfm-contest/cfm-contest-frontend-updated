
"use client";

import { backendRequest } from "@/lib/api/django/backend";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Copy,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Terminal,
  XCircle,
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Maximize2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { MarkdownRenderer } from "../MarkdownRenderer";

// ============================================================
// TYPES
// ============================================================

export type EmbeddableLanguage = {
  id: string | number;
  name: string;
  version: string;
};

export type ProblemFunction = {
  id: string | number;
  fn: string;
  lid: string | number;
};

export type EmbeddableProblem = {
  id: string | number;
  title: string;
  desc: string;
  time: number;
  memory: number;
  langs: EmbeddableLanguage[];
  func: Record<string, ProblemFunction>;
};

type ApiError = {
  message?: string;
  detail?: string;
  e?: string;
};

interface EmbeddableViewsProps {
  slug: string;
}

type BackendRunCase = {
  i?: number;
  in?: string;
  ex?: string;
  o?: string;
  s?: string;
  m?: number | null;
  c?: number | null;
  w?: number | null;
  e?: string;
  k?: number;
};

type BackendRunResponse = {
  r?: BackendRunCase | BackendRunCase[];
  s?: string;
  e?: string;
  message?: string;
};

export type RunTestResult = {
  index: number;
  input: string;
  expected_output: string;
  output: string;
  status: string;
  memory: number | null;
  cpu_time: number | null;
  wall_time: number | null;
  message: string;
  console: boolean;
  custom: boolean;
};

type RunResponse = {
  status: "done" | "error";
  result: RunTestResult[];
  message?: string;
};

// ============================================================
// MONACO
// ============================================================

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  {
    ssr: false,
    loading: () => <EditorLoading />,
  }
);

// ============================================================
// API
// ============================================================

async function getEmbeddableProblem(
  slug: string,
  signal?: AbortSignal
): Promise<EmbeddableProblem> {
  if (!slug?.trim()) {
    throw new Error("Masala slug'i berilmagan");
  }

  const response = await backendRequest(
    `/api/problems/${encodeURIComponent(slug)}/embeddable`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal,
    }
  );

  let data: EmbeddableProblem | ApiError | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = data as ApiError | null;

    if (response.status === 404) {
      throw new Error(error?.message || "Masala topilmadi");
    }

    if (response.status === 401) {
      throw new Error(error?.message || "Avval tizimga kiring");
    }

    if (response.status === 403) {
      throw new Error(
        error?.message || "Bu masalani ko'rishga ruxsat yo'q"
      );
    }

    throw new Error(
      error?.message ||
        error?.detail ||
        "Masalani yuklashda xatolik"
    );
  }

  if (!data) {
    throw new Error("Serverdan bo'sh javob qaytdi");
  }

  return data as EmbeddableProblem;
}

async function callExecudeApi(payload: {
  problem_id: number;
  language_id: number;
  code: string;
}): Promise<RunResponse> {
  const response = await backendRequest("/api/code/execude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let data: BackendRunResponse | null = null;

  try {
    data = await response.json();
  } catch {
    throw new Error("Serverdan noto'g'ri javob qaytdi");
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.e ||
        "Kodni ishga tushirishda xatolik"
    );
  }

  if (!data) {
    throw new Error("Serverdan bo'sh javob qaytdi");
  }

  return normalizeRunResponse(data);
}

// ============================================================
// RESPONSE NORMALIZER
// ============================================================

function normalizeRunResponse(
  data: BackendRunResponse
): RunResponse {
  if (data.message || data.s === "error") {
    return {
      status: "error",
      result: [],
      message:
        data.message ||
        data.e ||
        "Kodni ishga tushirishda xatolik",
    };
  }

  const raw = data.r;

  if (!raw) {
    return {
      status: "error",
      result: [],
      message: data.e || "Serverdan natija kelmadi",
    };
  }

  const cases = Array.isArray(raw) ? raw : [raw];

  if (cases.some((item) => item.s === "error")) {
    return {
      status: "error",
      result: [],
      message:
        cases.find((item) => item.s === "error")?.e ||
        "Execution error",
    };
  }

  return {
    status: "done",
    result: cases.map((item, index) => ({
      index: item.i ?? index + 1,
      input: item.in ?? "",
      expected_output: item.ex ?? "",
      output: item.o ?? "",
      status: item.s ?? "RE",
      memory: item.m ?? null,
      cpu_time: item.c ?? null,
      wall_time: item.w ?? null,
      message: item.e ?? "",
      console: item.ex == null,
      custom: item.k === 1,
    })),
  };
}

// ============================================================
// LANGUAGE
// ============================================================

function getMonacoLanguage(
  language: EmbeddableLanguage | null
): string {
  if (!language) return "plaintext";

  switch (language.name.trim().toLowerCase()) {
    case "python":
      return "python";
    case "javascript":
      return "javascript";
    case "typescript":
      return "typescript";
    case "c++":
      return "cpp";
    case "c":
      return "c";
    case "java":
      return "java";
    case "go":
    case "golang":
      return "go";
    case "rust":
      return "rust";
    case "c#":
    case "csharp":
      return "csharp";
    case "php":
      return "php";
    case "ruby":
      return "ruby";
    case "kotlin":
      return "kotlin";
    case "swift":
      return "swift";
    case "bash":
    case "shell":
      return "shell";
    case "sql":
      return "sql";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
      return "css";
    default:
      return "plaintext";
  }
}

// ============================================================
// FORMATTERS
// ============================================================

function formatRunMemory(kb: number | null): string | null {
  if (kb == null) return null;

  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(2)} MB`;
  }

  return `${kb} KB`;
}

function formatRunTime(ms: number | null): string | null {
  if (ms == null) return null;
  return `${ms} ms`;
}

function statusExitLabel(status: string): string {
  switch (status) {
    case "AC":
      return "Accepted";
    case "WA":
      return "Wrong Answer";
    case "TLE":
      return "Time Limit Exceeded";
    case "MLE":
      return "Memory Limit Exceeded";
    case "RE":
      return "Runtime Error";
    case "Server Error":
      return "Server Error";
    default:
      return status;
  }
}

function statusStyles(status: string) {
  switch (status) {
    case "AC":
      return {
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        icon: "text-emerald-600",
      };

    case "WA":
      return {
        badge: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
        icon: "text-red-500",
      };

    case "TLE":
    case "MLE":
      return {
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        icon: "text-amber-600",
      };

    default:
      return {
        badge: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
        icon: "text-red-500",
      };
  }
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function EmbeddableViews({ slug }: EmbeddableViewsProps) {
  const [problem, setProblem] =
    useState<EmbeddableProblem | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLanguageId, setSelectedLanguageId] =
    useState<string | null>(null);

  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const [runResults, setRunResults] =
    useState<RunTestResult[]>([]);

  const [runError, setRunError] =
    useState<string | null>(null);

  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);

  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const runController = useRef<AbortController | null>(null);

  // ==========================================================
  // LOAD PROBLEM
  // ==========================================================

  const loadProblem = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug?.trim()) {
        setLoading(false);
        setProblem(null);
        setError("Masala slug'i berilmagan");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getEmbeddableProblem(slug, signal);

        if (signal?.aborted) return;

        setProblem(data);
        setSelectedLanguageId(
          data.langs?.[0] ? String(data.langs[0].id) : null
        );

        setRunResults([]);
        setRunError(null);
        setCode("");
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setProblem(null);

        setError(
          err instanceof Error
            ? err.message
            : "Masalani yuklashda xatolik"
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [slug]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadProblem(controller.signal);

    return () => {
      controller.abort();
      runController.current?.abort();

      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }
    };
  }, [loadProblem]);

  // ==========================================================
  // SELECTED LANGUAGE
  // ==========================================================

  const selectedLanguage = useMemo(() => {
    if (!problem || selectedLanguageId == null) {
      return null;
    }

    return (
      problem.langs?.find(
        (language) => String(language.id) === selectedLanguageId
      ) ?? null
    );
  }, [problem, selectedLanguageId]);

  const editorLanguage = useMemo(
    () => getMonacoLanguage(selectedLanguage),
    [selectedLanguage]
  );

  // ==========================================================
  // STARTER CODE
  // ==========================================================

  useEffect(() => {
    if (!problem || selectedLanguageId == null) return;

    const starter = problem.func?.[selectedLanguageId];

    setCode(starter?.fn ?? "");
  }, [problem, selectedLanguageId]);

  // ==========================================================
  // LANGUAGE CHANGE
  // ==========================================================

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguageId(event.target.value);
      setCopied(false);
      setRunResults([]);
      setRunError(null);
    },
    []
  );

  // ==========================================================
  // EDITOR CHANGE
  // ==========================================================

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      setCode(value ?? "");
      setCopied(false);
      setRunResults([]);
      setRunError(null);
    },
    []
  );

  // ==========================================================
  // RESET
  // ==========================================================

  const handleResetCode = useCallback(() => {
    if (!problem || selectedLanguageId == null) return;

    const starter = problem.func?.[selectedLanguageId];

    setCode(starter?.fn ?? "");
    setCopied(false);
    setRunResults([]);
    setRunError(null);
  }, [problem, selectedLanguageId]);

  // ==========================================================
  // COPY
  // ==========================================================

  const handleCopyCode = useCallback(async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      if (copyTimeout.current) {
        clearTimeout(copyTimeout.current);
      }

      copyTimeout.current = setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }, [code]);

  // ==========================================================
  // RUN
  // ==========================================================

  const handleRunCode = useCallback(async () => {
    if (
      !problem ||
      selectedLanguageId == null ||
      !code.trim() ||
      isRunning
    ) {
      return;
    }

    runController.current?.abort();

    const controller = new AbortController();
    runController.current = controller;

    setIsRunning(true);
    setRunError(null);
    setRunResults([]);

    try {
      const encodedCode = window.btoa(
        unescape(encodeURIComponent(code))
      );

      const data = await callExecudeApi({
        problem_id: Number(problem.id),
        language_id: Number(selectedLanguageId),
        code: encodedCode,
      });

      if (controller.signal.aborted) return;

      if (data.status === "error") {
        setRunError(data.message || "Execution error");
        return;
      }

      setRunResults(data.result);
    } catch (err) {
      if (controller.signal.aborted) return;

      setRunError(
        err instanceof Error
          ? err.message
          : "Kodni ishga tushirishda xatolik"
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsRunning(false);
      }
    }
  }, [problem, selectedLanguageId, code, isRunning]);

  // ==========================================================
  // RESULTS SUMMARY
  // ==========================================================

  const passedCount = runResults.filter(
    (item) => item.status === "AC"
  ).length;

  const failedCount = runResults.length - passedCount;

  const allAccepted =
    runResults.length > 0 && failedCount === 0;

  // ==========================================================
  // LOADING / ERROR / EMPTY
  // ==========================================================

  if (loading) return <EmbeddableLoading />;

  if (error) {
    return (
      <EmbeddableError
        message={error}
        onRetry={() => void loadProblem()}
      />
    );
  }

  if (!problem) return <EmbeddableEmpty />;

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <section className="my-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-5">

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div className="min-w-0 flex-1">

            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Code2 className="size-4" />
              </div>

              <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {problem.title}
              </h3>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-10">

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock3 className="size-3.5" />
                <span>{problem.time}s time limit</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <HardDrive className="size-3.5" />
                <span>{problem.memory} MB memory</span>
              </div>

            </div>

          </div>

          {/* LANGUAGE SELECT */}

          {problem.langs?.length > 0 && (
            <div className="relative shrink-0">

              <Code2 className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />

              <select
                value={selectedLanguageId ?? ""}
                onChange={handleLanguageChange}
                disabled={isRunning}
                className="h-10 w-full min-w-[170px] cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:opacity-50 sm:w-auto"
              >
                {problem.langs.map((language) => (
                  <option
                    key={String(language.id)}
                    value={String(language.id)}
                  >
                    {language.name}
                    {language.version ? ` ${language.version}` : ""}
                  </option>
                ))}
              </select>

              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

            </div>
          )}

        </div>

      </header>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[0.88fr_1.12fr]">

        {/* ====================================================
            PROBLEM DESCRIPTION
        ==================================================== */}

        <div className="min-w-0 border-b border-slate-200 lg:border-b-0 lg:border-r">

          <div className="flex h-12 items-center justify-between border-b border-slate-100 px-5">

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Code2 className="size-3.5" />
              Problem Description
            </div>

            <button
              type="button"
              onClick={() =>
                setDescriptionExpanded((value) => !value)
              }
              className="text-xs font-medium text-slate-400 transition hover:text-slate-700 lg:hidden"
            >
              {descriptionExpanded ? "Collapse" : "Expand"}
            </button>

          </div>

          <div
            className={`overflow-y-auto px-5 py-5 ${
              descriptionExpanded
                ? "max-h-none"
                : "max-h-[420px] lg:max-h-[650px]"
            }`}
          >
            <MarkdownRenderer content={problem.desc} />
          </div>

        </div>

        {/* ====================================================
            CODE EDITOR
        ==================================================== */}

        <div className="min-w-0 bg-white">

          {/* EDITOR TOOLBAR */}

          <div className="flex h-12 items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-3 sm:px-4">

            <div className="flex min-w-0 items-center gap-2">

              <div className="hidden items-center gap-1.5 sm:flex">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-yellow-400" />
                <span className="size-2.5 rounded-full bg-green-400" />
              </div>

              <div className="mx-1 hidden h-4 w-px bg-slate-200 sm:block" />

              <Terminal className="size-3.5 shrink-0 text-slate-400" />

              <span className="truncate text-xs font-semibold text-slate-600">
                {selectedLanguage?.name ?? "Code"}
              </span>

              {selectedLanguage?.version && (
                <span className="hidden text-xs text-slate-400 sm:inline">
                  {selectedLanguage.version}
                </span>
              )}

            </div>

            <div className="flex shrink-0 items-center gap-1">

              {/* COPY */}

              <ToolbarButton
                onClick={handleCopyCode}
                disabled={!code}
                title={copied ? "Copied" : "Copy code"}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </ToolbarButton>

              {/* RESET */}

              <ToolbarButton
                onClick={handleResetCode}
                disabled={isRunning}
                title="Reset code"
              >
                <RotateCcw className="size-4" />
              </ToolbarButton>

              <div className="mx-1 h-5 w-px bg-slate-200" />

              {/* RUN */}

              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning || !code.trim()}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                {isRunning ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5 fill-current" />
                )}

                <span>
                  {isRunning ? "Running..." : "Run"}
                </span>
              </button>

            </div>

          </div>

          {/* EDITOR */}

          <div className="h-[420px] w-full bg-white sm:h-[520px]">

            <MonacoEditor
              language={editorLanguage}
              value={code}
              onChange={handleEditorChange}
              theme="vs"
              height="100%"
              options={{
                automaticLayout: true,
                fontSize: 14,
                lineHeight: 23,
                fontFamily:
                  "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace",
                fontLigatures: true,
                tabSize: 4,
                insertSpaces: true,
                detectIndentation: true,
                wordWrap: "on",
                wordWrapColumn: 100,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                scrollbar: {
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  useShadows: false,
                  verticalHasArrows: false,
                  horizontalHasArrows: false,
                },
                padding: {
                  top: 18,
                  bottom: 18,
                },
                minimap: {
                  enabled: false,
                },
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                folding: true,
                foldingHighlight: true,
                showFoldingControls: "mouseover",
                glyphMargin: false,
                bracketPairColorization: {
                  enabled: true,
                },
                guides: {
                  indentation: true,
                  bracketPairs: true,
                  highlightActiveIndentation: true,
                },
                quickSuggestions: true,
                suggestOnTriggerCharacters: true,
                parameterHints: {
                  enabled: true,
                },
                cursorBlinking: "smooth",
                cursorStyle: "line",
                cursorSmoothCaretAnimation: "on",
                renderWhitespace: "selection",
                roundedSelection: false,
                selectOnLineNumbers: true,
                contextmenu: true,
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                accessibilitySupport: "auto",
                links: true,
                colorDecorators: true,
                stickyScroll: {
                  enabled: true,
                },
                hover: {
    enabled: "on",
  },

  inlineSuggest: {
    enabled: true,
  },
              }}
            />

          </div>

          {/* EDITOR FOOTER */}

          <div className="flex h-8 items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 text-[10px] text-slate-400">

            <div className="flex items-center gap-3">
              <span>UTF-8</span>
              <span>Spaces: 4</span>
            </div>

            <span>
              {code.split("\n").length} lines
            </span>

          </div>

          {/* RESULTS */}

          {(isRunning ||
            runResults.length > 0 ||
            runError) && (
            <RunConsole
              isRunning={isRunning}
              runResults={runResults}
              runError={runError}
              languageName={selectedLanguage?.name}
              passedCount={passedCount}
              failedCount={failedCount}
              allAccepted={allAccepted}
            />
          )}

        </div>

      </div>

    </section>
  );
}

// ============================================================
// TOOLBAR BUTTON
// ============================================================

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex size-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

// ============================================================
// RUN CONSOLE
// ============================================================

function RunConsole({
  isRunning,
  runResults,
  runError,
  languageName,
  passedCount,
  failedCount,
  allAccepted,
}: {
  isRunning: boolean;
  runResults: RunTestResult[];
  runError: string | null;
  languageName?: string;
  passedCount: number;
  failedCount: number;
  allAccepted: boolean;
}) {
  const [expandedTests, setExpandedTests] =
    useState<number[]>([]);

  useEffect(() => {
    setExpandedTests(
      runResults.map((_, index) => index)
    );
  }, [runResults]);

  const toggleTest = (index: number) => {
    setExpandedTests((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  };

  return (
    <section className="border-t border-slate-200 bg-white">

      {/* CONSOLE HEADER */}

      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">

        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-slate-500" />

          <div>
            <h4 className="text-sm font-bold text-slate-800">
              Test Results
            </h4>

            <p className="text-[10px] text-slate-400">
              {languageName ?? "Code"} execution
            </p>
          </div>
        </div>

        {!isRunning && runResults.length > 0 && (
          <div className="flex items-center gap-2">

            <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              {passedCount} Passed
            </span>

            {failedCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                <XCircle className="size-3.5" />
                {failedCount} Failed
              </span>
            )}

          </div>
        )}

      </div>

      {/* RUNNING */}

      {isRunning && (
        <div className="flex items-center gap-3 p-5">

          <div className="flex size-10 items-center justify-center rounded-xl bg-slate-100">
            <Loader2 className="size-5 animate-spin text-slate-700" />
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Running your solution
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Code is being executed. Please wait...
            </p>
          </div>

        </div>
      )}

      {/* EXECUTION ERROR */}

      {runError && !isRunning && (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4">

          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertCircle className="size-4" />
            Execution Error
          </div>

          <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-red-600">
            {runError}
          </pre>

        </div>
      )}

      {/* SUMMARY */}

      {!isRunning && runResults.length > 0 && (
        <div className="space-y-3 p-3 sm:p-4">

          <div
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              allAccepted
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >

            {allAccepted ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-amber-600" />
            )}

            <div className="min-w-0">
              <p
                className={`text-sm font-bold ${
                  allAccepted
                    ? "text-emerald-800"
                    : "text-amber-800"
                }`}
              >
                {allAccepted
                  ? "All tests passed!"
                  : "Some tests failed"}
              </p>

              <p className="mt-0.5 text-xs text-slate-500">
                {passedCount} of {runResults.length} test cases passed
              </p>
            </div>

            <div className="ml-auto text-right">
              <p className="text-lg font-bold tabular-nums text-slate-800">
                {Math.round(
                  (passedCount / runResults.length) * 100
                )}%
              </p>
              <p className="text-[10px] text-slate-400">
                Success rate
              </p>
            </div>

          </div>

          {/* TEST LIST */}

          <div className="space-y-2">

            {runResults.map((result, index) => {
              const styles = statusStyles(result.status);
              const expanded = expandedTests.includes(index);

              return (
                <article
                  key={`${result.index}-${index}`}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >

                  {/* TEST ITEM HEADER */}

                  <button
                    type="button"
                    onClick={() => toggleTest(index)}
                    className="flex w-full flex-wrap items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50 sm:px-4"
                  >

                    <div className="flex min-w-0 items-center gap-2.5">

                      <span className={`size-2 shrink-0 rounded-full ${styles.dot}`} />

                      <span className="text-sm font-semibold text-slate-800">
                        Test Case #{result.index}
                      </span>

                      {result.custom && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-600">
                          CUSTOM
                        </span>
                      )}

                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-2 sm:gap-3">

                      {result.cpu_time != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock3 className="size-3" />
                          {formatRunTime(result.cpu_time)}
                        </span>
                      )}

                      {result.memory != null && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <HardDrive className="size-3" />
                          {formatRunMemory(result.memory)}
                        </span>
                      )}

                      <span
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold ${styles.badge}`}
                      >
                        {statusExitLabel(result.status)}
                      </span>

                      <ChevronDown
                        className={`size-4 text-slate-400 transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />

                    </div>

                  </button>

                  {/* TEST DETAILS */}

                  {expanded && (
                    <div className="space-y-3 border-t border-slate-100 p-3 sm:p-4">

                      {/* INPUT */}

                      {result.input && (
                        <ResultBlock
                          title="Input"
                          value={result.input}
                        />
                      )}

                      {/* OUTPUT */}

                      <ResultBlock
                        title="Your Output"
                        value={result.output}
                      />

                      {/* EXPECTED */}

                      {result.expected_output !== "" &&
                        result.status === "WA" && (
                          <ResultBlock
                            title="Expected Output"
                            value={result.expected_output}
                            variant="success"
                          />
                        )}

                      {/* ERROR MESSAGE */}

                      {result.message && (
                        <ResultBlock
                          title="Error Details"
                          value={result.message}
                          variant="error"
                        />
                      )}

                      {/* WALL TIME */}

                      {result.wall_time != null && (
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                          <Clock3 className="size-3" />
                          Wall time: {formatRunTime(result.wall_time)}
                        </div>
                      )}

                    </div>
                  )}

                </article>
              );
            })}

          </div>

        </div>
      )}

    </section>
  );
}

// ============================================================
// RESULT BLOCK
// ============================================================

function ResultBlock({
  title,
  value,
  variant = "default",
}: {
  title: string;
  value: string;
  variant?: "default" | "success" | "error";
}) {
  const styles = {
    default: {
      label: "text-slate-400",
      box: "border-slate-100 bg-slate-50",
      text: "text-slate-700",
    },
    success: {
      label: "text-emerald-600",
      box: "border-emerald-100 bg-emerald-50/50",
      text: "text-emerald-800",
    },
    error: {
      label: "text-red-500",
      box: "border-red-100 bg-red-50",
      text: "text-red-700",
    },
  }[variant];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${styles.label}`}>
          {title}
        </p>
      </div>

      <pre
        className={`overflow-x-auto whitespace-pre-wrap break-words rounded-lg border p-3 font-mono text-xs leading-relaxed ${styles.box} ${styles.text}`}
      >
        {value || "(empty output)"}
      </pre>
    </div>
  );
}

// ============================================================
// EDITOR LOADING
// ============================================================

function EditorLoading() {
  return (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center bg-white">
      <div className="flex items-center gap-2.5 text-sm text-slate-400">
        <RefreshCw className="size-4 animate-spin" />
        <span>Editor yuklanmoqda...</span>
      </div>
    </div>
  );
}

// ============================================================
// PAGE LOADING
// ============================================================

function EmbeddableLoading() {
  return (
    <section className="my-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">

      <div className="border-b border-slate-200 px-5 py-5">
        <div className="h-5 w-56 animate-pulse rounded bg-slate-100" />
        <div className="mt-3 h-3 w-36 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[0.88fr_1.12fr]">

        <div className="space-y-5 border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
          <div className="h-5 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-50" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-slate-50" />
          <div className="h-4 w-9/12 animate-pulse rounded bg-slate-50" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-50" />
        </div>

        <div className="min-h-[420px] animate-pulse bg-slate-50" />

      </div>
    </section>
  );
}

// ============================================================
// ERROR
// ============================================================

function EmbeddableError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="my-8 rounded-2xl border border-red-200 bg-red-50 p-5 sm:p-6">

      <div className="flex items-center gap-3">

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
          <AlertCircle className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-red-800">
            Masalani yuklab bo'lmadi
          </h3>

          <p className="mt-1 break-words text-sm text-red-600">
            {message}
          </p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          title="Qayta urinish"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-100"
        >
          <RefreshCw className="size-4" />
        </button>

      </div>

    </section>
  );
}

// ============================================================
// EMPTY
// ============================================================

function EmbeddableEmpty() {
  return (
    <section className="my-8 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center">

      <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        <Code2 className="size-6" />
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-800">
        Masala topilmadi
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        Ushbu masala mavjud emas yoki hozircha faol emas.
      </p>

    </section>
  );
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default EmbeddableViews;
