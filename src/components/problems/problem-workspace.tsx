"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Scan,
  Minimize,
  ChevronLeft,
  ChevronRight,
  FileText,
  Code2,
  Keyboard,
} from "lucide-react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import type { ProblemDetail } from "@/lib/problems/types";
import {
  getAdjacentProblem,
  getRandomProblem,
} from "@/lib/problems/api";
import { DescriptionPanel } from "./description-panel";
import {
  CodeEditorPanel,
  type CodeEditorPanelHandle,
} from "./code-editor-panel";
import {
  ProblemNavbar,
  type WorkspaceLayout,
} from "./problem-navbar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

interface ProblemWorkspaceProps {
  problem: ProblemDetail;
}

type PanelLayout =
  | "split"
  | "left-full"
  | "right-full";

// ============================================================
// MEDIA QUERY
// ============================================================

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    const update = () => {
      setMatches(media.matches);
    };

    update();

    media.addEventListener("change", update);

    return () => {
      media.removeEventListener("change", update);
    };
  }, [query]);

  return matches;
}

// ============================================================
// TOOLBAR
// ============================================================

const toolbarButtonClass = cn(
  "flex h-7 w-7 items-center justify-center rounded-md",
  "text-neutral-400",
  "bg-transparent transition-colors",
  "hover:bg-neutral-100 hover:text-neutral-800",
  "dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
);

// ============================================================
// WORKSPACE
// ============================================================

export function ProblemWorkspace({
  problem,
}: ProblemWorkspaceProps) {
  const router = useRouter();

  const isMobile = useMediaQuery(
    "(max-width: 767px)"
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [workspaceLayout, setWorkspaceLayout] =
    useState<WorkspaceLayout>("standard");

  const [panelLayout, setPanelLayout] =
    useState<PanelLayout>("split");

  const [mobileTab, setMobileTab] =
    useState<"desc" | "editor">("desc");

  const [isRunning, setIsRunning] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isNavigating, setIsNavigating] =
    useState(false);

  const [hasPrev, setHasPrev] =
    useState(true);

  const [hasNext, setHasNext] =
    useState(true);

  const [showShortcutsHint, setShowShortcutsHint] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const leftPanelRef =
    useRef<PanelImperativeHandle>(null);

  const rightPanelRef =
    useRef<PanelImperativeHandle>(null);

  const editorHandleRef =
    useRef<CodeEditorPanelHandle>(null);

  // ==========================================================
  // RESTORE LAYOUT
  // ==========================================================

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        "problem-workspace-layout"
      );

      if (
        saved === "standard" ||
        saved === "stacked" ||
        saved === "focus"
      ) {
        setWorkspaceLayout(
          saved as WorkspaceLayout
        );
      }
    } catch {
      // ignore
    }
  }, []);

  // ==========================================================
  // CHANGE LAYOUT
  // ==========================================================

  const changeLayout = useCallback(
    (layout: WorkspaceLayout) => {
      setWorkspaceLayout(layout);

      // Standard layout uchun eski split holatini tiklaymiz.
      setPanelLayout("split");

      try {
        localStorage.setItem(
          "problem-workspace-layout",
          layout
        );
      } catch {
        // ignore
      }
    },
    []
  );

  // ==========================================================
  // KEYBOARD
  // ==========================================================

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();

        editorHandleRef.current?.submit();
      }
    };

    window.addEventListener(
      "keydown",
      onKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKey
      );
    };
  }, []);

  // ==========================================================
  // SHORTCUT HINT
  // ==========================================================

  useEffect(() => {
    try {
      if (
        !localStorage.getItem(
          "ws-shortcuts-hint"
        )
      ) {
        setShowShortcutsHint(true);

        localStorage.setItem(
          "ws-shortcuts-hint",
          "1"
        );

        const timer = setTimeout(() => {
          setShowShortcutsHint(false);
        }, 6000);

        return () => {
          clearTimeout(timer);
        };
      }
    } catch {
      // ignore
    }
  }, []);

  // ==========================================================
  // PANEL LAYOUT
  // ==========================================================

  const applyPanelLayout = useCallback(
    (next: PanelLayout) => {
      const left =
        leftPanelRef.current;

      const right =
        rightPanelRef.current;

      if (!left || !right) return;

      if (next === "left-full") {
        right.resize("0%");
        left.resize("100%");
      }

      if (next === "right-full") {
        left.resize("0%");
        right.resize("100%");
      }

      if (next === "split") {
        left.resize("50%");
        right.resize("50%");
      }

      setPanelLayout(next);
    },
    []
  );

  const toggleLeftMaximize =
    useCallback(() => {
      applyPanelLayout(
        panelLayout === "left-full"
          ? "split"
          : "left-full"
      );
    }, [
      applyPanelLayout,
      panelLayout,
    ]);

  const toggleRightMaximize =
    useCallback(() => {
      applyPanelLayout(
        panelLayout === "right-full"
          ? "split"
          : "right-full"
      );
    }, [
      applyPanelLayout,
      panelLayout,
    ]);

  const collapseLeft =
    useCallback(() => {
      applyPanelLayout("right-full");
    }, [applyPanelLayout]);

  const collapseRight =
    useCallback(() => {
      applyPanelLayout("left-full");
    }, [applyPanelLayout]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const goToSlug = useCallback(
    (slug: string) => {
      router.push(`/problem/${slug}`);
    },
    [router]
  );

  const handlePrev = useCallback(
    async () => {
      if (isNavigating) return;

      setIsNavigating(true);

      try {
        const prev =
          await getAdjacentProblem(
            problem.slug,
            "prev"
          );

        if (prev) {
          goToSlug(prev.slug);
        } else {
          setHasPrev(false);

          editorHandleRef.current?.logConsole(
            "Bu ro'yxatdagi birinchi masala — oldingisi yo'q"
          );
        }
      } catch {
        editorHandleRef.current?.logConsole(
          "Oldingi masalaga o'tishda xatolik yuz berdi"
        );
      } finally {
        setIsNavigating(false);
      }
    },
    [
      isNavigating,
      problem.slug,
      goToSlug,
    ]
  );

  const handleNext = useCallback(
    async () => {
      if (isNavigating) return;

      setIsNavigating(true);

      try {
        const next =
          await getAdjacentProblem(
            problem.slug,
            "next"
          );

        if (next) {
          goToSlug(next.slug);
        } else {
          setHasNext(false);

          editorHandleRef.current?.logConsole(
            "Bu ro'yxatdagi oxirgi masala — keyingisi yo'q"
          );
        }
      } catch {
        editorHandleRef.current?.logConsole(
          "Keyingi masalaga o'tishda xatolik yuz berdi"
        );
      } finally {
        setIsNavigating(false);
      }
    },
    [
      isNavigating,
      problem.slug,
      goToSlug,
    ]
  );

  const handleRandom = useCallback(
    async () => {
      if (isNavigating) return;

      setIsNavigating(true);

      try {
        const random =
          await getRandomProblem(
            problem.slug
          );

        if (random?.slug) {
          goToSlug(random.slug);
        } else {
          editorHandleRef.current?.logConsole(
            "Boshqa mos masala topilmadi"
          );
        }
      } catch {
        editorHandleRef.current?.logConsole(
          "Tasodifiy masalaga o'tishda xatolik yuz berdi"
        );
      } finally {
        setIsNavigating(false);
      }
    },
    [
      isNavigating,
      problem.slug,
      goToSlug,
    ]
  );

  const handleNavbarAction =
    useCallback((label: string) => {
      editorHandleRef.current?.logConsole(
        label
      );
    }, []);

  // ==========================================================
  // MODES
  // ==========================================================

  const isStacked =
    workspaceLayout === "stacked";

  const focusMode =
    workspaceLayout === "focus" &&
    !isMobile;

  // ==========================================================
  // PANELS
  // ==========================================================

  const descPanel = (
    <DescriptionPanel
      problem={problem}
    />
  );

  const editorPanel = (
    <CodeEditorPanel
      ref={editorHandleRef}
      problem={problem}
      stacked={isStacked}
      onRunStateChange={setIsRunning}
      onSubmitStateChange={
        setIsSubmitting
      }
    />
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        flex
        h-[100dvh]
        w-full
        flex-col
        overflow-hidden
        bg-neutral-50
        dark:bg-neutral-900
        lg:h-[calc(100vh-3.5rem)]
      "
    >
      {/* ======================================================
          NAVBAR
      ====================================================== */}

      {!focusMode && (
        <ProblemNavbar
          slug={problem.slug}
          onRun={() =>
            editorHandleRef.current?.run()
          }
          onSubmit={() =>
            editorHandleRef.current?.submit()
          }
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onPrev={handlePrev}
          onNext={handleNext}
          onRandom={handleRandom}
          isNavigating={isNavigating}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onAction={handleNavbarAction}
          layout={workspaceLayout}
          onLayoutChange={
            changeLayout
          }
        />
      )}

      {/* ======================================================
          SHORTCUT HINT
      ====================================================== */}

      {showShortcutsHint &&
        !isMobile &&
        !focusMode && (
          <div
            className="
              pointer-events-none
              absolute
              left-1/2
              top-20
              z-40
              flex
              -translate-x-1/2
              items-center
              gap-2
              rounded-full
              border
              border-neutral-200
              bg-white/95
              px-4
              py-2
              text-xs
              text-neutral-500
              shadow-lg
              backdrop-blur
              dark:border-neutral-700
              dark:bg-neutral-900/95
              dark:text-neutral-400
            "
          >
            <Keyboard className="size-3.5" />

            <span>
              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1 font-mono dark:border-neutral-600 dark:bg-neutral-800">
                Ctrl
              </kbd>

              +

              <kbd className="rounded border border-neutral-300 bg-neutral-100 px-1 font-mono dark:border-neutral-600 dark:bg-neutral-800">
                Enter
              </kbd>

              {" — yuborish"}
            </span>
          </div>
        )}

      {/* ======================================================
          STACKED / TIZMA
          
          ENG MUHIM:
          Bu branch mobile va desktopdan OLDIN turadi.
          
          ResizablePanelGroup ishlatilmaydi.
          Bitta umumiy scroll.
      ====================================================== */}

      {isStacked ? (
        <main
          className="
            min-h-0
            flex-1
            overflow-x-hidden
            overflow-y-auto
            overscroll-y-contain
            touch-pan-y
            bg-neutral-100
            dark:bg-neutral-950
          "
        >
          {/* ==================================================
              DESCRIPTION
          ================================================== */}

          <section
            className="
              w-full
              bg-white
              dark:bg-neutral-950
            "
          >
            <div
              className="
                flex
                min-h-11
                items-center
                gap-2
                border-b
                border-neutral-200
                bg-white
                px-4
                dark:border-neutral-800
                dark:bg-neutral-950
              "
            >
              <FileText className="size-4 text-orange-500" />

              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Masala
              </span>
            </div>

            <div className="w-full overflow-visible">
              {descPanel}
            </div>
          </section>

          {/* ==================================================
              SEPARATOR
          ================================================== */}

          <div
            className="
              h-2
              w-full
              shrink-0
              bg-neutral-100
              dark:bg-neutral-900
            "
          />

          {/* ==================================================
              CODE + CONSOLE
              
              CodeEditorPanel stacked=true bo'lganda
              o'zi ham vertical natural heightda ishlaydi.
          ================================================== */}

          <section
            className="
              w-full
              bg-white
              dark:bg-neutral-950
            "
          >
            <div
              className="
                flex
                min-h-11
                items-center
                gap-2
                border-b
                border-neutral-200
                bg-white
                px-4
                dark:border-neutral-800
                dark:bg-neutral-950
              "
            >
              <Code2 className="size-4 text-orange-500" />

              <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Kod
              </span>
            </div>

            <div className="w-full overflow-visible">
              {editorPanel}
            </div>
          </section>

          {/* ==================================================
              BOTTOM SPACE
          ================================================== */}

          <div
            className="
              h-16
              w-full
              shrink-0
              bg-neutral-100
              dark:bg-neutral-950
            "
          />
        </main>
      ) : focusMode ? (
        /* ======================================================
           FOCUS
        ====================================================== */

        <main className="relative min-h-0 flex-1 p-2">
          <div
            className="
              h-full
              overflow-hidden
              rounded-xl
              border
              border-neutral-200
              bg-white
              dark:border-neutral-800
              dark:bg-neutral-950
            "
          >
            {editorPanel}
          </div>

          <button
            type="button"
            onClick={() =>
              changeLayout("standard")
            }
            className="
              absolute
              right-4
              top-4
              z-30
              flex
              h-8
              items-center
              gap-1.5
              rounded-lg
              border
              border-neutral-200
              bg-white
              px-3
              text-xs
              font-medium
              text-neutral-600
              shadow-md
              hover:bg-neutral-50
              dark:border-neutral-700
              dark:bg-neutral-900
              dark:text-neutral-300
              dark:hover:bg-neutral-800
            "
          >
            <Minimize className="size-3.5" />
            Diqqatdan chiqish
          </button>
        </main>
      ) : isMobile ? (
        /* ======================================================
           MOBILE STANDARD (Tab switcher between Tavsif and Kod)
        ====================================================== */

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-neutral-50 dark:bg-neutral-900">
          {/* Mobile Tabs */}
          <div className="flex shrink-0 items-center border-b border-neutral-200 bg-white px-2 py-1.5 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="grid w-full grid-cols-2 gap-1 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setMobileTab("desc")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all",
                  mobileTab === "desc"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
              >
                <FileText className="size-3.5" />
                <span>Tavsif</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("editor")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-all",
                  mobileTab === "editor"
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                )}
              >
                <Code2 className="size-3.5" />
                <span>Kod va Testlar</span>
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {mobileTab === "desc" ? (
              <div className="h-full overflow-y-auto bg-white dark:bg-neutral-950">
                {descPanel}
              </div>
            ) : (
              <div className="h-full overflow-hidden bg-white dark:bg-neutral-950">
                {editorPanel}
              </div>
            )}
          </div>
        </main>
      ) : (
        /* ======================================================
           DESKTOP STANDARD
        ====================================================== */

        <main
          className="
            relative
            min-h-0
            flex-1
            p-2
          "
        >
          <ResizablePanelGroup
            orientation="horizontal"
          >
            {/* ==================================================
                DESCRIPTION PANEL
            ================================================== */}

            <ResizablePanel
              panelRef={leftPanelRef}
              defaultSize="50%"
              minSize="0%"
              onResize={(size: any) => {
                if (
                  size > 5 &&
                  panelLayout === "left-full"
                ) {
                  setPanelLayout("split");
                }
              }}
            >
              <div
                className="
                  group
                  relative
                  h-full
                  overflow-hidden
                  rounded-xl
                  border
                  border-neutral-200
                  bg-white
                  dark:border-neutral-800
                  dark:bg-neutral-950
                "
              >
                {panelLayout !==
                  "right-full" && (
                  <div
                    className="
                      absolute
                      right-2
                      top-2
                      z-20
                      flex
                      items-center
                      gap-0.5
                      rounded-lg
                      bg-white/80
                      opacity-0
                      shadow-sm
                      backdrop-blur
                      transition-opacity
                      group-hover:opacity-100
                      dark:bg-neutral-900/80
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        toggleLeftMaximize
                      }
                      aria-label={
                        panelLayout ===
                        "left-full"
                          ? "Panelni tiklash"
                          : "Panelni to'liq oynaga yoyish"
                      }
                      className={
                        toolbarButtonClass
                      }
                    >
                      {panelLayout ===
                      "left-full" ? (
                        <Minimize className="size-3.5" />
                      ) : (
                        <Scan className="size-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={
                        collapseLeft
                      }
                      aria-label="Description panelini yopish"
                      className={
                        toolbarButtonClass
                      }
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                  </div>
                )}

                {descPanel}
              </div>
            </ResizablePanel>

            <ResizableHandle
              withHandle
              className="mx-1"
            />

            {/* ==================================================
                EDITOR PANEL
            ================================================== */}

            <ResizablePanel
              panelRef={rightPanelRef}
              defaultSize="50%"
              minSize="0%"
              onResize={(size: any) => {
                if (
                  size > 5 &&
                  panelLayout === "right-full"
                ) {
                  setPanelLayout("split");
                }
              }}
            >
              <div
                className="
                  group
                  relative
                  h-full
                  overflow-hidden
                  rounded-xl
                  border
                  border-neutral-200
                  bg-white
                  dark:border-neutral-800
                  dark:bg-neutral-950
                "
              >
                {panelLayout !==
                  "left-full" && (
                  <div
                    className="
                      absolute
                      right-2
                      top-2
                      z-20
                      flex
                      items-center
                      gap-0.5
                      rounded-lg
                      bg-white/80
                      opacity-0
                      shadow-sm
                      backdrop-blur
                      transition-opacity
                      group-hover:opacity-100
                      dark:bg-neutral-900/80
                    "
                  >
                    <button
                      type="button"
                      onClick={
                        collapseRight
                      }
                      aria-label="Code editor panelini yopish"
                      className={
                        toolbarButtonClass
                      }
                    >
                      <ChevronRight className="size-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={
                        toggleRightMaximize
                      }
                      aria-label={
                        panelLayout ===
                        "right-full"
                          ? "Panelni tiklash"
                          : "Panelni to'liq oynaga yoyish"
                      }
                      className={
                        toolbarButtonClass
                      }
                    >
                      {panelLayout ===
                      "right-full" ? (
                        <Minimize className="size-3.5" />
                      ) : (
                        <Scan className="size-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {editorPanel}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* ==================================================
              RIGHT FULL
          ================================================== */}

          {panelLayout ===
            "right-full" && (
            <button
              type="button"
              onClick={() =>
                applyPanelLayout("split")
              }
              aria-label="Description panelini ochish"
              className={cn(
                "absolute left-3 top-1/2 z-30 flex h-20 w-6 -translate-y-1/2 items-center justify-center",
                "rounded-r-md border border-l-0 border-neutral-200 bg-white text-neutral-400 shadow-sm",
                "transition-colors hover:bg-neutral-50 hover:text-neutral-800",
                "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800"
              )}
            >
              <ChevronRight className="size-8" />
            </button>
          )}

          {/* ==================================================
              LEFT FULL
          ================================================== */}

          {panelLayout ===
            "left-full" && (
            <button
              type="button"
              onClick={() =>
                applyPanelLayout("split")
              }
              aria-label="Code editor panelini ochish"
              className={cn(
                "absolute right-3 top-1/2 z-30 flex h-20 w-6 -translate-y-1/2 items-center justify-center",
                "rounded-l-md border border-r-0 border-neutral-200 bg-white text-neutral-400 shadow-sm",
                "transition-colors hover:bg-neutral-50 hover:text-neutral-800",
                "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800"
              )}
            >
              <ChevronLeft className="size-8" />
            </button>
          )}
        </main>
      )}
    </div>
  );
}
