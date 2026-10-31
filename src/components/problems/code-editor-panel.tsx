"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  type Ref,
} from "react";
import dynamic from "next/dynamic";
import type {
  ProblemDetail,
  Language,
} from "@/lib/problems/types";
import { useAuth } from "@/context/AuthContext";
import { toBase64 } from "@/lib/problems/utils";
import {
  runCode,
  submitCode,
} from "@/lib/problems/api";
import {
  submitContestCode,
  CONTEST_SUBMIT_BASE64,
} from "@/lib/contests/api";

import {
  ConsolePanel,
  useSubmitStream,
  useCustomTests,
  toWireTests,
  type ConsoleTab,
  type ResultMode,
  type RunWire,
} from "./Console";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { cn } from "@/lib/utils";

import {
  Loader2,
  Lock,
  ChevronDown,
  Settings,
  RotateCcw,
  Copy,
  Check,
  Sun,
  Moon,
  Minus,
  Plus,
  Scan,
  Minimize,
  Info,
  X,
} from "lucide-react";

import type { editor as MonacoEditorTypes } from "monaco-editor";
import type { PanelImperativeHandle } from "react-resizable-panels";

const Editor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
  }
);

// ============================================================
// MONACO
// ============================================================

const MONACO_LANG_MAP: Record<
  string,
  string
> = {
  python: "python",
  python3: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  "c++": "cpp",
  c: "c",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  csharp: "csharp",
  "c#": "csharp",
  kotlin: "kotlin",
  swift: "swift",
  dart: "dart",
};

function getMonacoLang(
  name: string
): string {
  return (
    MONACO_LANG_MAP[
      name.toLowerCase()
    ] || name.toLowerCase()
  );
}

// ============================================================
// CONSTANTS
// ============================================================

const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 24;

const paneToolbarButtonClass = cn(
  "flex h-7 w-7 items-center justify-center rounded-md text-neutral-400",
  "bg-transparent transition-colors",
  "hover:bg-neutral-100 hover:text-neutral-800"
);

// ============================================================
// TYPES
// ============================================================

export interface CodeEditorPanelHandle {
  run: () => void;
  submit: () => void;
  logConsole: (
    message: string
  ) => void;
}

interface CodeEditorPanelProps {
  problem: ProblemDetail;

  /**
   * Contest rejimi: submit /contests/{slug}/problems/{letter}/submit ga ketadi.
   * canSubmit=false bo'lsa yuborish bloklanadi (Run baribir ishlaydi).
   */
  contest?: {
    slug: string;
    letter: string;
    canSubmit: boolean;
  };

  /*
   * Tizma rejimi uchun.
   *
   * false:
   *   Editor + Console resizable.
   *
   * true:
   *   Editor + Console oddiy vertical block.
   */
  stacked?: boolean;

  onRunStateChange?: (
    isRunning: boolean
  ) => void;

  onSubmitStateChange?: (
    isSubmitting: boolean
  ) => void;
}

type VerticalLayout =
  | "split"
  | "editor-full"
  | "console-full";

// ============================================================
// COMPONENT
// ============================================================

export const CodeEditorPanel =
  forwardRef(function CodeEditorPanel(
    {
      problem,
      contest,
      stacked = false,
      onRunStateChange,
      onSubmitStateChange,
    }: CodeEditorPanelProps,
    ref: Ref<CodeEditorPanelHandle>
  ) {
    const {
      isAuthenticated,
      loginRequiredRedirect,
    } = useAuth();

    // ========================================================
    // LANGUAGE
    // ========================================================

    const [
      selectedLang,
      setSelectedLang,
    ] = useState<Language | null>(
      problem.hasAccess
        ? problem.languages[0] ?? null
        : null
    );

    const [codeMap, setCodeMap] =
      useState<Record<number, string>>(
        () => {
          if (!problem.hasAccess) {
            return {};
          }

          const initial: Record<
            number,
            string
          > = {};

          problem.languages.forEach(
            (lang) => {
              const starter =
                problem.starterCode[
                  lang.id
                ];

              initial[lang.id] =
                starter?.code || "";
            }
          );

          return initial;
        }
      );

    // ========================================================
    // CONSOLE STATE
    // ========================================================

    const [
      activeBottomTab,
      setActiveBottomTab,
    ] = useState<ConsoleTab>(
      "testcase"
    );

    const [isRunning, setIsRunning] =
      useState(false);

    const [isPosting, setIsPosting] =
      useState(false);

    const [runResults, setRunResults] =
      useState<RunWire | null>(null);

    const [resultMode, setResultMode] =
      useState<ResultMode>(null);

    const [error, setError] =
      useState<string | null>(null);

    const [stdin, setStdin] =
      useState("");

    const [
      customTests,
      setCustomTests,
    ] = useCustomTests(problem.id);

    const stream =
      useSubmitStream();

    const isSubmitting =
      isPosting || stream.active;

    const sampleTests = problem.hasAccess
      ? problem.sampleTests
      : [];

    const consoleMode = sampleTests.length === 0;

    // ========================================================
    // EDITOR SETTINGS
    // ========================================================

    const [
      settingsOpen,
      setSettingsOpen,
    ] = useState(false);

    const [fontSize, setFontSize] =
      useState(14);

    const [
      isDarkTheme,
      setIsDarkTheme,
    ] = useState(false);

    const [tabSize, setTabSize] =
      useState<2 | 4>(4);

    const [wordWrap, setWordWrap] =
      useState(true);

    const [cursorPos, setCursorPos] =
      useState({
        line: 1,
        col: 1,
      });

    const [copied, setCopied] =
      useState(false);

    const [justSaved, setJustSaved] =
      useState(true);

    // ========================================================
    // NOTICE
    // ========================================================

    const [
      consoleNotice,
      setConsoleNotice,
    ] = useState<string | null>(
      null
    );

    const noticeTimeoutRef =
      useRef<ReturnType<
        typeof setTimeout
      > | null>(null);

    // ========================================================
    // NORMAL RESIZABLE LAYOUT
    // ========================================================

    const [vLayout, setVLayout] =
      useState<VerticalLayout>(
        "split"
      );

    const editorPaneRef =
      useRef<PanelImperativeHandle>(
        null
      );

    const consolePaneRef =
      useRef<PanelImperativeHandle>(
        null
      );

    // ========================================================
    // REFS
    // ========================================================

    const settingsRef =
      useRef<HTMLDivElement>(null);

    const editorRef =
      useRef<
        MonacoEditorTypes.IStandaloneCodeEditor | null
      >(null);

    // ========================================================
    // CODE
    // ========================================================

    const code = selectedLang
      ? codeMap[
          selectedLang.id
        ] || ""
      : "";

    // ========================================================
    // CODE CHANGE
    // ========================================================

    const setCode = useCallback(
      (
        langId: number,
        value: string
      ) => {
        setCodeMap((prev) => ({
          ...prev,
          [langId]: value,
        }));

        setJustSaved(false);

        const timer =
          setTimeout(() => {
            setJustSaved(true);
          }, 500);

        return () =>
          clearTimeout(timer);
      },
      []
    );

    // ========================================================
    // RUN STATE
    // ========================================================

    useEffect(() => {
      onRunStateChange?.(
        isRunning
      );
    }, [
      isRunning,
      onRunStateChange,
    ]);

    // ========================================================
    // SUBMIT STATE
    // ========================================================

    useEffect(() => {
      onSubmitStateChange?.(
        isSubmitting
      );
    }, [
      isSubmitting,
      onSubmitStateChange,
    ]);

    // ========================================================
    // SETTINGS OUTSIDE CLICK
    // ========================================================

    useEffect(() => {
      function handleClick(
        event: MouseEvent
      ) {
        if (
          settingsRef.current &&
          !settingsRef.current.contains(
            event.target as Node
          )
        ) {
          setSettingsOpen(false);
        }
      }

      document.addEventListener(
        "mousedown",
        handleClick
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handleClick
        );
      };
    }, []);

    // ========================================================
    // NOTICE CLEANUP
    // ========================================================

    useEffect(() => {
      return () => {
        if (
          noticeTimeoutRef.current
        ) {
          clearTimeout(
            noticeTimeoutRef.current
          );
        }
      };
    }, []);

    // ========================================================
    // MONACO MOUNT
    // ========================================================

    const handleEditorMount = (
      editorInstance: MonacoEditorTypes.IStandaloneCodeEditor
    ) => {
      editorRef.current =
        editorInstance;

      editorInstance.onDidChangeCursorPosition(
        (event) => {
          setCursorPos({
            line:
              event.position
                .lineNumber,
            col:
              event.position.column,
          });
        }
      );
    };

    // ========================================================
    // COPY
    // ========================================================

    const handleCopyCode =
      async () => {
        await navigator.clipboard.writeText(
          code
        );

        setCopied(true);

        setTimeout(() => {
          setCopied(false);
        }, 1500);
      };

    // ========================================================
    // RESET
    // ========================================================

    const handleResetCode = () => {
      if (
        !selectedLang ||
        !problem.hasAccess
      ) {
        return;
      }

      const starter =
        problem.starterCode[
          selectedLang.id
        ];

      setCode(
        selectedLang.id,
        starter?.code || ""
      );
    };

    // ========================================================
    // RUN
    // ========================================================

    const handleRun =
      useCallback(
        async (
          stdinOverride?: string
        ) => {
          if (!isAuthenticated) {
            loginRequiredRedirect();
            return;
          }

          if (!selectedLang) {
            return;
          }

          const continuing =
            typeof stdinOverride ===
            "string";

          setIsRunning(true);
          setError(null);
          setResultMode("run");
          setActiveBottomTab(
            "result"
          );

          if (!continuing) {
            setRunResults(null);
          }

          try {
            const res =
              await runCode({
                problem_id:
                  problem.id,
                language_id:
                  selectedLang.id,
                code: toBase64(code),
                stdin: consoleMode
                  ? continuing
                    ? stdinOverride
                    : stdin
                  : "",
                ...(consoleMode
                  ? {}
                  : {
                      tc: toWireTests(
                        customTests
                      ),
                    }),
              });

            setRunResults(
              res as unknown as RunWire
            );
          } catch (err: any) {
            setError(
              err.message ||
                "Run jarayonida xatolik"
            );
          } finally {
            setIsRunning(false);
          }
        },
        [
          isAuthenticated,
          loginRequiredRedirect,
          problem.id,
          selectedLang,
          code,
          consoleMode,
          stdin,
          customTests,
        ]
      );

    // ========================================================
    // PROVIDE INPUT
    // ========================================================

    const handleProvideInput =
      useCallback(
        (line: string) => {
          const base =
            stdin === "" ||
            stdin.endsWith("\n")
              ? stdin
              : stdin + "\n";

          const next = `${base}${line}\n`;

          setStdin(next);

          handleRun(next);
        },
        [stdin, handleRun]
      );

    // ========================================================
    // SUBMIT
    // ========================================================

    const handleSubmit =
      useCallback(
        async () => {
          if (!isAuthenticated) {
            loginRequiredRedirect();
            return;
          }

          if (!selectedLang) {
            return;
          }

          if (contest && !contest.canSubmit) {
            setResultMode("submit");
            setActiveBottomTab("result");
            setError("Hozir yechim yuborish mumkin emas.");
            return;
          }

          setIsPosting(true);
          setError(null);
          setResultMode("submit");
          setActiveBottomTab(
            "result"
          );

          try {
            // SSE POST'dan OLDIN ulanadi.
            stream.begin();

            const res = contest
              ? await submitContestCode(
                  contest.slug,
                  problem.slug,
                  {
                    id: selectedLang.id,
                    code: CONTEST_SUBMIT_BASE64
                      ? toBase64(code)
                      : code,
                  }
                )
              : await submitCode({
                  problem_id:
                    problem.id,
                  language_id:
                    selectedLang.id,
                  code: toBase64(code),
                });

            if (!res?.t) {
              throw new Error(
                "Server task_id qaytarmadi"
              );
            }

            stream.track(res.t);
          } catch (err: any) {
            const msg =
              err.message ||
              "Submit jarayonida xatolik";

            stream.fail(msg);
            setError(msg);
          } finally {
            setIsPosting(false);
          }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
          isAuthenticated,
          loginRequiredRedirect,
          problem.id,
          selectedLang,
          code,
          contest?.slug,
          contest?.letter,
          contest?.canSubmit,
        ]
      );

    // ========================================================
    // CONSOLE NOTICE
    // ========================================================

    const logConsole =
      useCallback(
        (message: string) => {
          if (
            noticeTimeoutRef.current
          ) {
            clearTimeout(
              noticeTimeoutRef.current
            );
          }

          setConsoleNotice(message);

          noticeTimeoutRef.current =
            setTimeout(() => {
              setConsoleNotice(null);
            }, 4000);
        },
        []
      );

    // ========================================================
    // IMPERATIVE API
    // ========================================================

    useImperativeHandle(
      ref,
      () => ({
        run: () => {
          handleRun();
        },

        submit: handleSubmit,

        logConsole,
      }),
      [
        handleRun,
        handleSubmit,
        logConsole,
      ]
    );

    // ========================================================
    // NORMAL VERTICAL LAYOUT
    // ========================================================

    const applyVLayout = (
      next: VerticalLayout
    ) => {
      const editorPane =
        editorPaneRef.current;

      const consolePane =
        consolePaneRef.current;

      if (
        !editorPane ||
        !consolePane
      ) {
        return;
      }

      if (
        next === "editor-full"
      ) {
        consolePane.resize("0%");
        editorPane.resize("100%");
      } else if (
        next === "console-full"
      ) {
        editorPane.resize("0%");
        consolePane.resize("100%");
      } else {
        editorPane.resize("65%");
        consolePane.resize("35%");
      }

      setVLayout(next);
    };

    const toggleEditorMaximize =
      () =>
        applyVLayout(
          vLayout === "editor-full"
            ? "split"
            : "editor-full"
        );

    const toggleConsoleMaximize =
      () =>
        applyVLayout(
          vLayout === "console-full"
            ? "split"
            : "console-full"
        );

    // ========================================================
    // ACCESS GUARDS
    // ========================================================

    if (!problem.hasAccess) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-white text-neutral-500">
          <Lock className="size-12 text-amber-400" />

          <p className="text-sm">
            Kod muharriri faqat
            Premium masalalarga
            kirish huquqi borlarga
            ochiq
          </p>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-white text-neutral-500">
          <Lock className="size-12 text-neutral-300" />

          <p className="text-sm">
            Kod yozish va yechim
            yuborish uchun tizimga
            kiring
          </p>

          <button
            onClick={() =>
              loginRequiredRedirect()
            }
            className="
              rounded-lg
              bg-orange-600
              px-5
              py-2
              text-sm
              font-medium
              text-white
              hover:bg-orange-700
            "
          >
            Kirish
          </button>
        </div>
      );
    }

    if (!selectedLang) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-white text-neutral-400">
          <p className="text-sm">
            Bu masala uchun til
            sozlanmagan
          </p>
        </div>
      );
    }

    // ========================================================
    // EDITOR CONTENT
    // ========================================================

    const editorContent = (
      <div
        className={cn(
          "group relative w-full",
          stacked
            ? "min-h-[600px]"
            : "h-full"
        )}
      >
        {!stacked &&
          vLayout !==
            "console-full" && (
            <div
              className="
                absolute
                right-2
                top-2
                z-20
                opacity-100
                transition-opacity
                [@media(hover:hover)]:opacity-0
                [@media(hover:hover)]:group-hover:opacity-100
              "
            >
              <button
                type="button"
                onClick={
                  toggleEditorMaximize
                }
                aria-label={
                  vLayout ===
                  "editor-full"
                    ? "Muharrirni tiklash"
                    : "Muharrirni to'liq oynaga yoyish (100%)"
                }
                className={
                  paneToolbarButtonClass
                }
              >
                {vLayout ===
                "editor-full" ? (
                  <Minimize className="size-3.5" />
                ) : (
                  <Scan className="size-3.5" />
                )}
              </button>
            </div>
          )}

        <Editor
          height={
            stacked
              ? "600px"
              : "100%"
          }
          language={getMonacoLang(
            selectedLang.name
          )}
          value={code}
          onChange={(value) =>
            setCode(
              selectedLang.id,
              value || ""
            )
          }
          onMount={
            handleEditorMount
          }
          theme={
            isDarkTheme
              ? "vs-dark"
              : "vs"
          }
          options={{
            fontSize,
            fontFamily:
              "JetBrains Mono, Fira Code, monospace",
            minimap: {
              enabled: false,
            },
            scrollBeyondLastLine:
              false,
            automaticLayout: true,
            tabSize,
            insertSpaces: true,
            wordWrap: wordWrap
              ? "on"
              : "off",
            padding: {
              top: 16,
            },
            lineNumbers: "on",
            renderWhitespace:
              "selection",
            bracketPairColorization: {
              enabled: true,
            },
            smoothScrolling: true,
            cursorBlinking: "smooth",
          }}
          loading={
            <div className="flex h-full items-center justify-center text-neutral-400">
              <Loader2 className="size-5 animate-spin" />
            </div>
          }
        />
      </div>
    );

    // ========================================================
    // CONSOLE CONTENT
    // ========================================================

    const consoleContent = (
      <div
        className={cn(
          "group relative flex w-full flex-col bg-neutral-50",
          stacked
            ? "min-h-[430px]"
            : "h-full"
        )}
      >
        {!stacked &&
          vLayout !==
            "editor-full" && (
            <div
              className="
                absolute
                right-2
                top-1.5
                z-20
                opacity-100
                transition-opacity
                [@media(hover:hover)]:opacity-0
                [@media(hover:hover)]:group-hover:opacity-100
              "
            >
              <button
                type="button"
                onClick={
                  toggleConsoleMaximize
                }
                aria-label={
                  vLayout ===
                  "console-full"
                    ? "Konsolni tiklash"
                    : "Konsolni to'liq oynaga yoyish (100%)"
                }
                className={
                  paneToolbarButtonClass
                }
              >
                {vLayout ===
                "console-full" ? (
                  <Minimize className="size-3.5" />
                ) : (
                  <Scan className="size-3.5" />
                )}
              </button>
            </div>
          )}

        {/* ====================================================
            STATUS
        ==================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-neutral-200
            bg-white
            px-4
            py-1
            text-[11px]
            text-neutral-400
          "
        >
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors",
                justSaved
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              )}
            />

            {justSaved
              ? "Saqlandi"
              : "Saqlanmoqda…"}
          </span>

          <span className="tabular-nums">
            {cursorPos.line}-qator,{" "}
            {cursorPos.col}-ustun
          </span>
        </div>

        {/* ====================================================
            NOTICE
        ==================================================== */}

        {consoleNotice && (
          <div
            className="
              flex
              shrink-0
              items-center
              justify-between
              gap-2
              border-b
              border-blue-100
              bg-blue-50
              px-4
              py-1.5
              text-xs
              text-blue-700
            "
          >
            <span className="flex items-center gap-1.5">
              <Info className="size-3.5 shrink-0" />

              {consoleNotice}
            </span>

            <button
              onClick={() =>
                setConsoleNotice(null)
              }
              className="
                shrink-0
                text-blue-400
                transition-colors
                hover:text-blue-700
              "
              aria-label="Xabarni yopish"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* ====================================================
            CONSOLE
        ==================================================== */}

        <div
          className={cn(
            "w-full",
            stacked
              ? "min-h-[350px]"
              : "min-h-0 flex-1"
          )}
        >
          <ConsolePanel
            slug={problem.slug}
            exam={problem.sampleTests}
            activeTab={
              activeBottomTab
            }
            onTabChange={
              setActiveBottomTab
            }
            mode={resultMode}
            runResult={runResults}
            isRunning={isRunning}
            stream={stream.state}
            isSubmitting={
              isSubmitting
            }
            error={error}
            customTests={customTests}
            onCustomTestsChange={
              setCustomTests
            }
            stdin={stdin}
            onStdinChange={setStdin}
            onProvideInput={
              handleProvideInput
            }
          />
        </div>
      </div>
    );

    // ========================================================
    // TOOLBAR
    // ========================================================

    const toolbar = (
      <div
        className="
          flex
          shrink-0
          items-center
          justify-between
          border-b
          border-neutral-200
          px-3
          py-2
        "
      >
        {/* LEFT */}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 pl-1 text-sm font-medium text-neutral-700">
            <span className="text-neutral-400">
              &lt;/&gt;
            </span>

            Kod
          </div>

          <div className="h-4 w-px bg-neutral-200" />

          <div className="relative">
            <select
              value={selectedLang.id}
              onChange={(event) => {
                const lang =
                  problem.languages.find(
                    (item) =>
                      item.id ===
                      Number(
                        event.target.value
                      )
                  );

                if (lang) {
                  setSelectedLang(
                    lang
                  );
                }
              }}
              className="
                appearance-none
                rounded-md
                border
                border-neutral-200
                bg-white
                py-1
                pl-3
                pr-8
                text-xs
                font-medium
                text-neutral-700
                transition-colors
                hover:bg-neutral-50
                focus:border-orange-500
                focus:outline-none
              "
            >
              {problem.languages.map(
                (lang) => (
                  <option
                    key={lang.id}
                    value={lang.id}
                  >
                    {lang.name}{" "}
                    {lang.version}
                  </option>
                )
              )}
            </select>

            <ChevronDown
              className="
                pointer-events-none
                absolute
                right-2
                top-1/2
                size-3
                -translate-y-1/2
                text-neutral-400
              "
            />
          </div>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-1 pr-14">
          {/* COPY */}

          <ToolbarIconButton
            label="Kodni nusxalash"
            onClick={
              handleCopyCode
            }
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </ToolbarIconButton>

          {/* RESET */}

          <ToolbarIconButton
            label="Boshlang'ich kodga qaytarish"
            onClick={
              handleResetCode
            }
          >
            <RotateCcw className="size-3.5" />
          </ToolbarIconButton>

          {/* SETTINGS */}

          <div
            className="relative"
            ref={settingsRef}
          >
            <ToolbarIconButton
              label="Muharrir sozlamalari"
              active={
                settingsOpen
              }
              onClick={() =>
                setSettingsOpen(
                  (value) =>
                    !value
                )
              }
            >
              <Settings className="size-3.5" />
            </ToolbarIconButton>

            {settingsOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-9
                  z-50
                  w-64
                  rounded-lg
                  border
                  border-neutral-200
                  bg-white
                  p-3
                  shadow-lg
                "
              >
                {/* FONT */}

                <SettingRow label="Shrift o'lchami">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFontSize(
                          (size) =>
                            Math.max(
                              FONT_SIZE_MIN,
                              size - 1
                            )
                        )
                      }
                      className="
                        flex
                        size-6
                        items-center
                        justify-center
                        rounded-md
                        border
                        border-neutral-200
                        text-neutral-500
                        hover:bg-neutral-50
                      "
                    >
                      <Minus className="size-3" />
                    </button>

                    <span className="w-6 text-center text-xs font-medium text-neutral-700 tabular-nums">
                      {fontSize}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setFontSize(
                          (size) =>
                            Math.min(
                              FONT_SIZE_MAX,
                              size + 1
                            )
                        )
                      }
                      className="
                        flex
                        size-6
                        items-center
                        justify-center
                        rounded-md
                        border
                        border-neutral-200
                        text-neutral-500
                        hover:bg-neutral-50
                      "
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </SettingRow>

                {/* THEME */}

                <SettingRow label="Mavzu">
                  <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        setIsDarkTheme(
                          false
                        )
                      }
                      className={cn(
                        "flex size-6 items-center justify-center rounded",
                        !isDarkTheme
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-50"
                      )}
                    >
                      <Sun className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsDarkTheme(
                          true
                        )
                      }
                      className={cn(
                        "flex size-6 items-center justify-center rounded",
                        isDarkTheme
                          ? "bg-neutral-800 text-white"
                          : "text-neutral-400 hover:bg-neutral-50"
                      )}
                    >
                      <Moon className="size-3.5" />
                    </button>
                  </div>
                </SettingRow>

                {/* TAB */}

                <SettingRow label="Tab kengligi">
                  <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5">
                    {[2, 4].map(
                      (size) => (
                        <button
                          type="button"
                          key={size}
                          onClick={() =>
                            setTabSize(
                              size as
                                | 2
                                | 4
                            )
                          }
                          className={cn(
                            "flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs font-medium",
                            tabSize ===
                              size
                              ? "bg-neutral-800 text-white"
                              : "text-neutral-500 hover:bg-neutral-50"
                          )}
                        >
                          {size}
                        </button>
                      )
                    )}
                  </div>
                </SettingRow>

                {/* WRAP */}

                <SettingRow
                  label="Qatorni o'rash"
                  last
                >
                  <button
                    type="button"
                    onClick={() =>
                      setWordWrap(
                        (value) =>
                          !value
                      )
                    }
                    className={cn(
                      "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                      wordWrap
                        ? "bg-orange-500"
                        : "bg-neutral-200"
                    )}
                    aria-pressed={
                      wordWrap
                    }
                    aria-label="Qatorni o'rash"
                  >
                    <span
                      className={cn(
                        "size-4 rounded-full bg-white shadow-sm transition-transform",
                        wordWrap &&
                          "translate-x-4"
                      )}
                    />
                  </button>
                </SettingRow>
              </div>
            )}
          </div>
        </div>
      </div>
    );

    // ========================================================
    // FINAL
    // ========================================================

    return (
      <div
        className={cn(
          "flex w-full flex-col bg-white",
          stacked
            ? "h-auto min-h-0 overflow-visible"
            : "h-full min-h-0 overflow-hidden"
        )}
      >
        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        {toolbar}

        {/* ====================================================
            STACKED
        ==================================================== */}

        {stacked ? (
          <div
            className="
              flex
              w-full
              flex-col
              overflow-visible
            "
          >
            {/* ================================================
                EDITOR
            ================================================ */}

            <section
              className="
                w-full
                shrink-0
                border-b
                border-neutral-200
                bg-white
              "
            >
              <div
                className="
                  flex
                  h-10
                  items-center
                  border-b
                  border-neutral-100
                  bg-neutral-50
                  px-4
                  text-xs
                  font-medium
                  text-neutral-500
                "
              >
                Editor
              </div>

              <div className="w-full min-h-[600px]">
                {editorContent}
              </div>
            </section>

            {/* ================================================
                CONSOLE
            ================================================ */}

            <section
              className="
                w-full
                shrink-0
                bg-neutral-50
              "
            >
              <div
                className="
                  flex
                  h-10
                  items-center
                  border-b
                  border-neutral-200
                  bg-white
                  px-4
                  text-xs
                  font-medium
                  text-neutral-500
                "
              >
                Console
              </div>

              <div className="w-full min-h-[430px]">
                {consoleContent}
              </div>
            </section>
          </div>
        ) : (
          /* ====================================================
             NORMAL RESIZABLE EDITOR + CONSOLE
          ==================================================== */

          <div className="min-h-0 flex-1">
            <ResizablePanelGroup
              orientation="vertical"
            >
              {/* ================================================
                  EDITOR PANEL
              ================================================ */}

              <ResizablePanel
                panelRef={
                  editorPaneRef
                }
                defaultSize="65%"
                minSize="0%"
                onResize={(
                  size: any
                ) => {
                  if (
                    size > 5 &&
                    vLayout ===
                      "editor-full"
                  ) {
                    setVLayout(
                      "split"
                    );
                  }
                }}
              >
                {editorContent}
              </ResizablePanel>

              <ResizableHandle
                withHandle
              />

              {/* ================================================
                  CONSOLE PANEL
              ================================================ */}

              <ResizablePanel
                panelRef={
                  consolePaneRef
                }
                defaultSize="35%"
                minSize="0%"
                onResize={(
                  size: any
                ) => {
                  if (
                    size > 5 &&
                    vLayout ===
                      "console-full"
                  ) {
                    setVLayout(
                      "split"
                    );
                  }
                }}
              >
                {consoleContent}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    );
  });

CodeEditorPanel.displayName =
  "CodeEditorPanel";

// ============================================================
// TOOLBAR BUTTON
// ============================================================

function ToolbarIconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 transition-colors",
        "hover:bg-neutral-100 hover:text-neutral-800",
        active &&
          "bg-neutral-100 text-neutral-800"
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// SETTING ROW
// ============================================================

function SettingRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5",
        !last &&
          "border-b border-neutral-100"
      )}
    >
      <span className="text-xs text-neutral-600">
        {label}
      </span>

      {children}
    </div>
  );
}
