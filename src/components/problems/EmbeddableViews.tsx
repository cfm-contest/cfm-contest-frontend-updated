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
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
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
};

interface EmbeddableViewsProps {
  slug: string;
}

// ============================================================
// RUN (EXECUTE) TYPES
// ============================================================

export type RunTestResult = {
  index: number;
  input: string;
  expected_output: string;
  output: string;
  status: string; // "AC" | "WA" | "TLE" | "MLE" | "RE" | "Server Error"
  memory: number | null;
  cpu_time: number | null;
  wall_time: number | null;
  message: string;
  console?: boolean;
};

export type RunResponse = {
  status: string; // "done" | "error"
  problem_id?: number;
  language?: string;
  result?: RunTestResult;
  message?: string;
};


// ============================================================
// MONACO
// ============================================================

const MonacoEditor = dynamic(
  () =>
    import("@monaco-editor/react").then(
      (module) => module.default
    ),
  {
    ssr: false,

    loading: () => (
      <EditorLoading />
    ),
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
    throw new Error(
      "Masala slug'i berilmagan"
    );
  }

  const response = await backendRequest(
    `/api/problems/${encodeURIComponent(
      slug
    )}/embeddable`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      credentials: "include",

      cache: "no-store",

      signal,
    }
  );

  let data:
    | EmbeddableProblem
    | ApiError
    | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let message =
      "Masalani yuklashda xatolik";

    if (data && typeof data === "object") {
      if (
        "message" in data &&
        data.message
      ) {
        message = data.message;
      } else if (
        "detail" in data &&
        data.detail
      ) {
        message = data.detail;
      }
    }

    if (response.status === 404) {
      throw new Error(
        message || "Masala topilmadi"
      );
    }

    if (response.status === 401) {
      throw new Error(
        message ||
          "Avval tizimga kiring"
      );
    }

    if (response.status === 403) {
      throw new Error(
        message ||
          "Bu masalani ko'rishga ruxsat yo'q"
      );
    }

    throw new Error(message);
  }

  if (!data) {
    throw new Error(
      "Serverdan bo'sh javob qaytdi"
    );
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

  let data: RunResponse | null = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message || "Kodni ishga tushirishda xatolik"
    );
  }

  if (!data) {
    throw new Error("Serverdan bo'sh javob qaytdi");
  }

  return data;
}


// ============================================================
// MONACO LANGUAGE
// ============================================================
//
// Backend faqat:
// {
//   name: "Python",
//   version: "3.12.0"
// }
//
// qaytaradi.
//
// Piston uchun alohida field kerak emas.
// ============================================================

function getMonacoLanguage(
  language: EmbeddableLanguage | null
): string {
  if (!language) {
    return "plaintext";
  }

  const value = language.name
    .trim()
    .toLowerCase();

  switch (value) {
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
// RUN FORMATTING HELPERS
// ============================================================

function formatRunMemory(kb: number | null): string | null {
  if (kb == null) return null;
  if (kb >= 1024) {
    return `${(kb / 1024).toFixed(1)}MB`;
  }
  return `${kb}KB`;
}

function formatRunTime(ms: number | null): string | null {
  if (ms == null) return null;
  return `${ms}ms`;
}

function statusDotColor(status: string): string {
  if (status === "AC") return "bg-emerald-400";
  if (status === "WA") return "bg-red-400";
  if (status === "TLE" || status === "MLE") return "bg-amber-400";
  return "bg-red-400";
}

function statusTextColor(status: string): string {
  if (status === "AC") return "text-emerald-400";
  if (status === "WA") return "text-red-400";
  if (status === "TLE" || status === "MLE") return "text-amber-400";
  return "text-red-400";
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


// ============================================================
// MAIN COMPONENT
// ============================================================

export function EmbeddableViews({
  slug,
}: EmbeddableViewsProps) {
  const [problem, setProblem] =
    useState<EmbeddableProblem | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    selectedLanguageId,
    setSelectedLanguageId,
  ] = useState<
    string | number | null
  >(null);

  const [code, setCode] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunTestResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);


  // ==========================================================
  // LOAD PROBLEM
  // ==========================================================

  const loadProblem = useCallback(
    async (signal?: AbortSignal) => {
      if (!slug?.trim()) {
        setLoading(false);
        setProblem(null);
        setError(
          "Masala slug'i berilmagan"
        );

        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data =
          await getEmbeddableProblem(
            slug,
            signal
          );

        if (signal?.aborted) {
          return;
        }

        setProblem(data);

        const firstLanguage =
          data.langs?.[0];

        if (firstLanguage) {
          setSelectedLanguageId(
            firstLanguage.id
          );
        } else {
          setSelectedLanguageId(null);
          setCode("");
        }
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


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const controller =
      new AbortController();

    void loadProblem(
      controller.signal
    );

    return () => {
      controller.abort();
    };
  }, [loadProblem]);


  // ==========================================================
  // SELECTED LANGUAGE
  // ==========================================================

  const selectedLanguage =
    useMemo(() => {
      if (
        !problem ||
        selectedLanguageId == null
      ) {
        return null;
      }

      return (
        problem.langs?.find(
          (language) =>
            String(language.id) ===
            String(selectedLanguageId)
        ) ?? null
      );
    }, [
      problem,
      selectedLanguageId,
    ]);


  // ==========================================================
  // STARTER CODE
  // ==========================================================

  useEffect(() => {
    if (
      !problem ||
      selectedLanguageId == null
    ) {
      return;
    }

    const starter =
      problem.func?.[
        String(selectedLanguageId)
      ];

    setCode(starter?.fn ?? "");
  }, [
    problem,
    selectedLanguageId,
  ]);


  // ==========================================================
  // MONACO LANGUAGE
  // ==========================================================

  const editorLanguage =
    useMemo(() => {
      return getMonacoLanguage(
        selectedLanguage
      );
    }, [selectedLanguage]);


  // ==========================================================
  // LANGUAGE CHANGE
  // ==========================================================

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedLanguageId(event.target.value);
      setCopied(false);
      setRunResult(null);
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
      setRunResult(null);
      setRunError(null);
    },
    []
  );


  // ==========================================================
  // RESET CODE
  // ==========================================================

  const handleResetCode = useCallback(() => {
    if (!problem || selectedLanguageId == null) {
      return;
    }

    const starter = problem.func?.[String(selectedLanguageId)];

    setCode(starter?.fn ?? "");
    setCopied(false);
    setRunResult(null);
    setRunError(null);
  }, [problem, selectedLanguageId]);


  // ==========================================================
  // COPY CODE
  // ==========================================================

  const handleCopyCode =
    useCallback(async () => {
      if (!code) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          code
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        setCopied(false);
      }
    }, [code]);


  // ==========================================================
  // RUN CODE
  // ==========================================================

  const handleRunCode = useCallback(async () => {
    if (!problem || selectedLanguageId == null || !code.trim()) {
      return;
    }

    setIsRunning(true);
    setRunError(null);
    setRunResult(null);

    try {
      const encodedCode =
        typeof window !== "undefined"
          ? window.btoa(unescape(encodeURIComponent(code)))
          : code;

      const data = await callExecudeApi({
        problem_id: Number(problem.id),
        language_id: Number(selectedLanguageId),
        code: encodedCode,
      });

      if (data.status === "error") {
        setRunError(data.message || "Kodni ishga tushirishda xatolik");

        return;
      }

      if (data.result) {
        setRunResult(data.result);
      }
    } catch (err) {
      setRunError(
        err instanceof Error
          ? err.message
          : "Kodni ishga tushirishda xatolik"
      );
    } finally {
      setIsRunning(false);
    }
  }, [problem, selectedLanguageId, code]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <EmbeddableLoading />
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <EmbeddableError
        message={error}
        onRetry={() => {
          void loadProblem();
        }}
      />
    );
  }


  // ==========================================================
  // EMPTY
  // ==========================================================

  if (!problem) {
    return <EmbeddableEmpty />;
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <section
      className="
        my-8
        w-full
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
      "
    >
      {/* ====================================================
          PROBLEM HEADER
      ==================================================== */}

      <div
        className="
          border-b
          border-slate-200
          bg-white
          px-5
          py-4
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          {/* =================================================
              TITLE + META
          ================================================= */}

          <div className="min-w-0">
            <h3
              className="
                truncate
                text-base
                font-semibold
                text-slate-900
              "
            >
              {problem.title}
            </h3>

            <div
              className="
                mt-2
                flex
                items-center
                gap-4
                text-xs
                text-slate-400
              "
            >
              {/* TIME */}

              {problem.time != null && (
                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                  title="Bajarilish vaqti"
                >
                  <Clock3 className="size-3.5" />

                  <span>
                    {problem.time}s
                  </span>
                </div>
              )}

              {/* MEMORY */}

              {problem.memory != null && (
                <div
                  className="
                    flex
                    items-center
                    gap-1.5
                  "
                  title="Xotira chegarasi"
                >
                  <HardDrive className="size-3.5" />

                  <span>
                    {problem.memory} MB
                  </span>
                </div>
              )}
            </div>
          </div>


          {/* =================================================
              LANGUAGE SELECT
          ================================================= */}

          {problem.langs?.length > 0 && (
            <div className="relative shrink-0">
              <Code2
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  size-4
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <select
                value={
                  selectedLanguageId != null
                    ? String(
                        selectedLanguageId
                      )
                    : ""
                }
                onChange={
                  handleLanguageChange
                }
                className="
                  h-9
                  min-w-[165px]
                  cursor-pointer
                  appearance-none
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  pl-9
                  pr-9
                  text-sm
                  font-medium
                  text-slate-700
                  outline-none
                  transition
                  hover:border-slate-300
                  focus:border-slate-400
                  focus:ring-2
                  focus:ring-slate-100
                "
              >
                {problem.langs.map(
                  (language) => (
                    <option
                      key={String(
                        language.id
                      )}
                      value={String(
                        language.id
                      )}
                    >
                      {language.name}

                      {language.version
                        ? ` ${language.version}`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                className="
                  pointer-events-none
                  absolute
                  right-3
                  top-1/2
                  size-4
                  -translate-y-1/2
                  text-slate-400
                "
              />
            </div>
          )}
        </div>
      </div>


      {/* ====================================================
          MAIN CONTENT
      ==================================================== */}

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[0.9fr_1.1fr]
        "
      >
        {/* ==================================================
            DESCRIPTION
        ================================================== */}

        <div
          className="
            min-w-0
            border-b
            border-slate-200
            p-5
            lg:border-b-0
            lg:border-r
          "
        >
          <div
            className="
              mb-4
              flex
              items-center
              gap-2
              text-[11px]
              font-semibold
              uppercase
              tracking-[0.12em]
              text-slate-400
            "
          >
            <Code2 className="size-3.5" />

            <span>
              Masala
            </span>
          </div>

          <div
            className="
              max-h-[520px]
              overflow-y-auto
              pr-3
            "
          >
            <MarkdownRenderer
              content={problem.desc}
            />
          </div>
        </div>


        {/* ==================================================
            EDITOR
        ================================================== */}

        <div
          className="
            min-w-0
            bg-white
          "
        >
          {/* =================================================
              EDITOR TOOLBAR
          ================================================= */}

          <div
            className="
              flex
              h-11
              items-center
              justify-between
              border-b
              border-slate-200
              bg-slate-50/70
              px-3
              sm:px-4
            "
          >
            {/* LEFT */}

            <div
              className="
                flex
                min-w-0
                items-center
                gap-3
              "
            >
              {/* DOTS */}

              <div
                className="
                  hidden
                  items-center
                  gap-1.5
                  sm:flex
                "
              >
                <span className="size-2 rounded-full bg-red-400" />
                <span className="size-2 rounded-full bg-yellow-400" />
                <span className="size-2 rounded-full bg-green-400" />
              </div>

              <div
                className="
                  hidden
                  h-4
                  w-px
                  bg-slate-200
                  sm:block
                "
              />

              {/* LANGUAGE */}

              <div
                className="
                  flex
                  min-w-0
                  items-center
                  gap-2
                "
              >
                <Terminal
                  className="
                    size-3.5
                    shrink-0
                    text-slate-400
                  "
                />

                <span
                  className="
                    truncate
                    text-xs
                    font-medium
                    text-slate-600
                  "
                >
                  {selectedLanguage?.name ??
                    "Code"}
                </span>

                {selectedLanguage?.version && (
                  <>
                    <span className="text-slate-300">
                      /
                    </span>

                    <span
                      className="
                        text-xs
                        text-slate-400
                      "
                    >
                      {selectedLanguage.version}
                    </span>
                  </>
                )}
              </div>
            </div>


            {/* RIGHT */}

            <div
              className="
                flex
                items-center
                gap-0.5
              "
            >
              {/* COPY */}

              <button
                type="button"
                onClick={handleCopyCode}
                disabled={!code}
                title={
                  copied
                    ? "Nusxalandi"
                    : "Kodni nusxalash"
                }
                aria-label={
                  copied
                    ? "Nusxalandi"
                    : "Kodni nusxalash"
                }
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-md
                  text-slate-400
                  transition
                  hover:bg-white
                  hover:text-slate-700
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>


              {/* RESET */}

              <button
                type="button"
                onClick={handleResetCode}
                title="Kodni tiklash"
                aria-label="Kodni tiklash"
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-md
                  text-slate-400
                  transition
                  hover:bg-white
                  hover:text-slate-700
                "
              >
                <RotateCcw className="size-4" />
              </button>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              {/* RUN */}

              <button
                type="button"
                onClick={handleRunCode}
                disabled={isRunning || !code.trim()}
                title="Kodni ishga tushirish"
                aria-label="Kodni ishga tushirish"
                className="
                  flex
                  h-8
                  items-center
                  gap-1.5
                  rounded-md
                  bg-slate-900
                  px-3
                  text-xs
                  font-medium
                  text-white
                  transition
                  hover:bg-slate-800
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                {isRunning ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}

                <span className="hidden sm:inline">
                  {isRunning ? "Ishlamoqda..." : "Run"}
                </span>
              </button>
            </div>
          </div>


          {/* =================================================
              MONACO EDITOR
          ================================================= */}

          <div
            className="
              h-[520px]
              w-full
              bg-white
            "
          >
            <MonacoEditor
              language={editorLanguage}
              value={code}
              onChange={
                handleEditorChange
              }
              theme="vs"
              height="100%"
              options={{
                automaticLayout: true,
                fontSize: 14,
                lineHeight: 22,
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
                  top: 16,
                  bottom: 16,
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
                  enabled: true,
                },
                inlineSuggest: {
                  enabled: true,
                },
              } as any}
            />
          </div>

          {/* =================================================
              RUN CONSOLE
          ================================================= */}

          {(isRunning || runResult || runError) && (
            <RunConsole
              isRunning={isRunning}
              runResult={runResult}
              runError={runError}
              languageName={selectedLanguage?.name}
            />
          )}
        </div>
      </div>
    </section>
  );
}


// ============================================================
// RUN CONSOLE — haqiqiy terminalga o'xshash yagona natija oynasi
// ============================================================
// ============================================================
// RUN CONSOLE — haqiqiy terminalga o'xshash yagona natija oynasi
// ============================================================

function RunConsole({
  isRunning,
  runResult,
  runError,
  languageName,
}: {
  isRunning: boolean;
  runResult: RunTestResult | null;
  runError: string | null;
  languageName?: string;
}) {
  return (
    <div className="border-t border-slate-200 bg-white">
      {/* WINDOW BAR */}
      <div className="flex h-9 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-3.5">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-red-400" />
          <span className="size-2.5 rounded-full bg-yellow-400" />
          <span className="size-2.5 rounded-full bg-green-400" />

          <span className="ml-2 font-mono text-[11px] text-slate-400">
            {(languageName ?? "code").toLowerCase()}
          </span>
        </div>

        {runResult && (
          <div className="flex items-center gap-2.5 font-mono text-[11px]">
            <span
              className={`flex items-center gap-1.5 font-semibold ${statusTextColor(
                runResult.status
              )}`}
            >
              <span
                className={`size-1.5 rounded-full ${statusDotColor(
                  runResult.status
                )}`}
              />
              {statusExitLabel(runResult.status)}
            </span>

            {formatRunTime(runResult.cpu_time) && (
              <span className="text-slate-400">
                {formatRunTime(runResult.cpu_time)}
              </span>
            )}

            {formatRunMemory(runResult.memory) && (
              <span className="text-slate-400">
                {formatRunMemory(runResult.memory)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="max-h-72 overflow-auto p-4 font-mono text-[13px] leading-relaxed">
        {isRunning && !runResult && !runError && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-emerald-600">$</span>
            <span className="animate-pulse">running...</span>
          </div>
        )}

        {runError && (
          <div>
            <span className="text-emerald-600">$ </span>
            <span className="text-red-600">{runError}</span>
          </div>
        )}

        {runResult && (
          <>
            {/* stdin, agar mavjud bo'lsa */}
            {!runResult.console && runResult.input && (
              <div className="mb-2 text-slate-400">
                <span className="text-emerald-600">$ </span>
                <span className="whitespace-pre-wrap">
                  {runResult.input}
                </span>
              </div>
            )}

            {/* stdout */}
            <div className="whitespace-pre-wrap text-slate-800">
              {runResult.output || (
                <span className="text-slate-400">
                  (chiqish bo'sh)
                </span>
              )}
            </div>

            {/* WA holatida — kutilgan natija, xuddi shell izohi kabi */}
            {!runResult.console &&
              runResult.status === "WA" && (
                <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
                  <span className="text-slate-400"># expected</span>
                  <div className="mt-1 whitespace-pre-wrap text-slate-600">
                    {runResult.expected_output}
                  </div>
                </div>
              )}

            {/* stderr */}
            {runResult.message && (
              <div className="mt-3 whitespace-pre-wrap text-red-600">
                {runResult.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ============================================================
// EDITOR LOADING
// ============================================================

function EditorLoading() {
  return (
    <div
      className="
        flex
        h-full
        min-h-[300px]
        w-full
        items-center
        justify-center
        bg-white
      "
    >
      <div
        className="
          flex
          items-center
          gap-2.5
          text-sm
          text-slate-400
        "
      >
        <RefreshCw
          className="
            size-4
            animate-spin
          "
        />

        <span>
          Editor yuklanmoqda...
        </span>
      </div>
    </div>
  );
}


// ============================================================
// PAGE LOADING
// ============================================================

function EmbeddableLoading() {
  return (
    <section
      className="
        my-8
        w-full
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
      "
    >
      {/* HEADER */}

      <div
        className="
          border-b
          border-slate-200
          px-5
          py-4
        "
      >
        <div
          className="
            h-5
            w-48
            animate-pulse
            rounded
            bg-slate-100
          "
        />

        <div
          className="
            mt-2
            h-3
            w-32
            animate-pulse
            rounded
            bg-slate-100
          "
        />
      </div>


      {/* CONTENT */}

      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-[0.9fr_1.1fr]
        "
      >
        {/* DESCRIPTION */}

        <div className="space-y-4 p-5">
          <div
            className="
              h-3
              w-20
              animate-pulse
              rounded
              bg-slate-100
            "
          />

          <div
            className="
              h-5
              w-48
              animate-pulse
              rounded
              bg-slate-100
            "
          />

          <div
            className="
              h-4
              w-full
              animate-pulse
              rounded
              bg-slate-50
            "
          />

          <div
            className="
              h-4
              w-11/12
              animate-pulse
              rounded
              bg-slate-50
            "
          />

          <div
            className="
              h-4
              w-8/12
              animate-pulse
              rounded
              bg-slate-50
            "
          />
        </div>


        {/* EDITOR */}

        <div
          className="
            min-h-[520px]
            animate-pulse
            border-l
            border-slate-200
            bg-slate-50
          "
        />
      </div>
    </section>
  );
}


// ============================================================
// ERROR
// ============================================================

interface EmbeddableErrorProps {
  message: string;
  onRetry: () => void;
}

function EmbeddableError({
  message,
  onRetry,
}: EmbeddableErrorProps) {
  return (
    <section
      className="
        my-8
        rounded-xl
        border
        border-red-200
        bg-red-50
        p-5
      "
    >
      <div
        className="
          flex
          items-center
          gap-3
        "
      >
        {/* ICON */}

        <div
          className="
            flex
            size-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-red-100
            text-red-600
          "
        >
          <Code2 className="size-4" />
        </div>


        {/* MESSAGE */}

        <div className="min-w-0">
          <div
            className="
              text-sm
              font-semibold
              text-red-800
            "
          >
            Masalani yuklab bo'lmadi
          </div>

          <div
            className="
              mt-1
              text-sm
              text-red-600
            "
          >
            {message}
          </div>
        </div>


        {/* RETRY */}

        <button
          type="button"
          onClick={onRetry}
          title="Qayta urinish"
          aria-label="Qayta urinish"
          className="
            ml-auto
            flex
            size-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-red-200
            bg-white
            text-red-600
            transition
            hover:bg-red-100
          "
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
    <section
      className="
        my-8
        rounded-xl
        border
        border-slate-200
        bg-slate-50
        p-8
        text-center
      "
    >
      <div
        className="
          mx-auto
          flex
          size-10
          items-center
          justify-center
          rounded-full
          bg-white
          text-slate-400
          shadow-sm
        "
      >
        <Code2 className="size-5" />
      </div>

      <div
        className="
          mt-3
          text-sm
          font-semibold
          text-slate-800
        "
      >
        Masala topilmadi
      </div>

      <p
        className="
          mt-1
          text-sm
          text-slate-500
        "
      >
        Ushbu masala mavjud emas yoki
        hozircha faol emas.
      </p>
    </section>
  );
}


// ============================================================
// ============================================================

export default EmbeddableViews;
