"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Link2,
  Loader2,
  Sparkles,
  Trophy,
  Shuffle,
  Volume2,
  VolumeX,
  Smartphone,
  X,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

import {
  BaseQuestionProps,
  MatchingPairLeft,
  MatchingPairRight,
  QuestionSubmitResponse,
} from "@/lib/types/question";

import { MarkdownRenderer } from "@/components/MarkdownRenderer";

/* =========================================================================
   TYPES
   ========================================================================= */

interface MatchingQuestionProps extends BaseQuestionProps {
  pairsLeft: MatchingPairLeft[];
  pairsRight: MatchingPairRight[];

  onNextQuestion?: () => void;
  hasNextQuestion?: boolean;
  /** Yuborishda xato bo'lsa chaqiriladi (berilmasa xato avvalgidek tashqariga otiladi) */
  onError?: (err: unknown) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Connection {
  leftId: number;
  rightId: number;
  colorIndex: number;
}

interface DragState {
  leftId: number;
  start: Point;
  current: Point;
}

/* =========================================================================
   UTILITY
   ========================================================================= */

function cn(
  ...inputs: (
    | string
    | boolean
    | undefined
    | null
    | Record<string, boolean>
  )[]
): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.filter(Boolean).join(" ").trim();
}

/* =========================================================================
   SOUND
   ========================================================================= */

class SoundController {
  private ctx: AudioContext | null = null;

  public enabled = true;

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext: typeof AudioContext;
          }
        ).webkitAudioContext;

      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public playSelect() {
    if (!this.enabled) return;

    try {
      this.initCtx();

      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";

      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  public playConnect() {
    if (!this.enabled) return;

    try {
      this.initCtx();

      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      [523.25, 659.25].forEach((frequency, index) => {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const start = now + index * 0.06;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          start + 0.16
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.18);
      });
    } catch {}
  }

  public playDisconnect() {
    if (!this.enabled) return;

    try {
      this.initCtx();

      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";

      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  public playWin() {
    if (!this.enabled) return;

    try {
      this.initCtx();

      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const chord = [
        523.25,
        659.25,
        783.99,
        1046.5,
      ];

      chord.forEach((frequency, index) => {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const start = now + index * 0.08;

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, start);

        gain.gain.setValueAtTime(0.18, start);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          start + 0.35
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.38);
      });
    } catch {}
  }

  public playError() {
    if (!this.enabled) return;

    try {
      this.initCtx();

      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";

      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + 0.22
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }
}

const soundEffects = new SoundController();

/* =========================================================================
   COLORS
   ========================================================================= */

export const MATCH_COLORS = [
  {
    bg: "bg-indigo-50/90",
    border: "border-indigo-400",
    text: "text-indigo-700",
    stroke: "#6366f1",
    glow: "rgba(99,102,241,.25)",
  },
  {
    bg: "bg-emerald-50/90",
    border: "border-emerald-400",
    text: "text-emerald-700",
    stroke: "#10b981",
    glow: "rgba(16,185,129,.25)",
  },
  {
    bg: "bg-amber-50/90",
    border: "border-amber-400",
    text: "text-amber-700",
    stroke: "#f59e0b",
    glow: "rgba(245,158,11,.25)",
  },
  {
    bg: "bg-rose-50/90",
    border: "border-rose-400",
    text: "text-rose-700",
    stroke: "#f43f5e",
    glow: "rgba(244,63,94,.25)",
  },
  {
    bg: "bg-violet-50/90",
    border: "border-violet-400",
    text: "text-violet-700",
    stroke: "#8b5cf6",
    glow: "rgba(139,92,246,.25)",
  },
  {
    bg: "bg-cyan-50/90",
    border: "border-cyan-400",
    text: "text-cyan-700",
    stroke: "#06b6d4",
    glow: "rgba(6,182,212,.25)",
  },
  {
    bg: "bg-orange-50/90",
    border: "border-orange-400",
    text: "text-orange-700",
    stroke: "#f97316",
    glow: "rgba(249,115,22,.25)",
  },
  {
    bg: "bg-teal-50/90",
    border: "border-teal-400",
    text: "text-teal-700",
    stroke: "#14b8a6",
    glow: "rgba(20,184,166,.25)",
  },
];

/* =========================================================================
   COMPONENT
   ========================================================================= */

export function MatchingQuestion({
  questionId,
  text,
  instruction,
  explanation,
  pairsLeft = [],
  pairsRight = [],
  disabled = false,
  onAnswerSubmit,
  onNextQuestion,
  hasNextQuestion = false,
  onError,
}: MatchingQuestionProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  const leftRefs = useRef<
    Record<number, HTMLButtonElement | null>
  >({});

  const rightRefs = useRef<
    Record<number, HTMLButtonElement | null>
  >({});

  const [connections, setConnections] =
    useState<Connection[]>([]);

  const [selectedLeftId, setSelectedLeftId] =
    useState<number | null>(null);

  const [selectedRightId, setSelectedRightId] =
    useState<number | null>(null);

  const [drag, setDrag] =
    useState<DragState | null>(null);

  const [hoveredRight, setHoveredRight] =
    useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [result, setResult] =
    useState<QuestionSubmitResponse | null>(null);

  const [soundEnabled, setSoundEnabled] =
    useState(true);

  const [, setLayoutVersion] = useState(0);

  const [orderedRight, setOrderedRight] =
    useState<MatchingPairRight[]>([]);

  /*
   * Question o'zgarganda hamma narsani reset qilish.
   */
  useEffect(() => {
    setOrderedRight([...pairsRight]);

    setConnections([]);

    setSelectedLeftId(null);
    setSelectedRightId(null);

    setDrag(null);
    setHoveredRight(null);

    setResult(null);
    setIsSubmitting(false);
  }, [questionId, pairsRight]);

  /* =========================================================================
     LAYOUT
     ========================================================================= */

  const refreshLayout = useCallback(() => {
    setLayoutVersion((value) => value + 1);
  }, []);

  useLayoutEffect(() => {
    const board = boardRef.current;

    if (!board) return;

    const observer = new ResizeObserver(() => {
      refreshLayout();
    });

    observer.observe(board);

    Object.values(leftRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    Object.values(rightRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [
    pairsLeft,
    orderedRight,
    connections,
    refreshLayout,
  ]);

  useEffect(() => {
    const refresh = () => refreshLayout();

    window.addEventListener("resize", refresh);
    window.addEventListener(
      "orientationchange",
      refresh
    );

    window.addEventListener(
      "scroll",
      refresh,
      true
    );

    return () => {
      window.removeEventListener(
        "resize",
        refresh
      );

      window.removeEventListener(
        "orientationchange",
        refresh
      );

      window.removeEventListener(
        "scroll",
        refresh,
        true
      );
    };
  }, [refreshLayout]);

  /* =========================================================================
     CONNECTOR COORDINATES
     ========================================================================= */

  const getConnectorPoint = useCallback(
    (
      element: HTMLElement | null,
      side: "left" | "right"
    ): Point | null => {
      const board = boardRef.current;

      if (!board || !element) return null;

      const connector =
        element.querySelector<HTMLElement>(
          `[data-connector="${side}"]`
        );

      const target = connector ?? element;

      const boardRect =
        board.getBoundingClientRect();

      const targetRect =
        target.getBoundingClientRect();

      return {
        x:
          targetRect.left -
          boardRect.left +
          targetRect.width / 2,

        y:
          targetRect.top -
          boardRect.top +
          targetRect.height / 2,
      };
    },
    []
  );

  const getPointerPoint = useCallback(
    (
      event: React.PointerEvent
    ): Point | null => {
      const board = boardRef.current;

      if (!board) return null;

      const rect =
        board.getBoundingClientRect();

      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    },
    []
  );

  /* =========================================================================
     CONNECTION HELPERS
     ========================================================================= */

  const getLeftConnection = useCallback(
    (leftId: number) =>
      connections.find(
        (connection) =>
          connection.leftId === leftId
      ),
    [connections]
  );

  const getRightConnection = useCallback(
    (rightId: number) =>
      connections.find(
        (connection) =>
          connection.rightId === rightId
      ),
    [connections]
  );

  /* =========================================================================
     CONNECT
     ========================================================================= */

  const connectPair = useCallback(
    (leftId: number, rightId: number) => {
      if (
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      soundEffects.playConnect();

      try {
        navigator.vibrate?.(25);
      } catch {}

      setConnections((previous) => {
        /*
         * Bitta LEFT faqat bitta RIGHT bilan.
         * Bitta RIGHT ham faqat bitta LEFT bilan.
         */
        const filtered = previous.filter(
          (connection) =>
            connection.leftId !== leftId &&
            connection.rightId !== rightId
        );

        const leftIndex =
          pairsLeft.findIndex(
            (pair) => pair.id === leftId
          );

        return [
          ...filtered,
          {
            leftId,
            rightId,
            colorIndex:
              leftIndex >= 0
                ? leftIndex
                : filtered.length,
          },
        ];
      });

      setSelectedLeftId(null);
      setSelectedRightId(null);

      requestAnimationFrame(refreshLayout);
    },
    [
      disabled,
      isSubmitting,
      result,
      pairsLeft,
      refreshLayout,
    ]
  );

  /* =========================================================================
     TAP LEFT
     ========================================================================= */

  const handleLeftCardTap = useCallback(
    (leftId: number) => {
      if (
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      soundEffects.playSelect();

      try {
        navigator.vibrate?.(10);
      } catch {}

      /*
       * Agar RIGHT tanlangan bo'lsa,
       * darhol ulaymiz.
       */
      if (selectedRightId !== null) {
        connectPair(
          leftId,
          selectedRightId
        );

        return;
      }

      /*
       * Agar shu LEFT qayta bosilsa,
       * selection bekor qilinadi.
       */
      setSelectedLeftId((previous) =>
        previous === leftId
          ? null
          : leftId
      );
    },
    [
      disabled,
      isSubmitting,
      result,
      selectedRightId,
      connectPair,
    ]
  );

  /* =========================================================================
     TAP RIGHT
     ========================================================================= */

  const handleRightCardTap = useCallback(
    (rightId: number) => {
      if (
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      soundEffects.playSelect();

      try {
        navigator.vibrate?.(10);
      } catch {}

      /*
       * LEFT tanlangan bo'lsa,
       * ulaymiz.
       */
      if (selectedLeftId !== null) {
        connectPair(
          selectedLeftId,
          rightId
        );

        return;
      }

      setSelectedRightId((previous) =>
        previous === rightId
          ? null
          : rightId
      );
    },
    [
      disabled,
      isSubmitting,
      result,
      selectedLeftId,
      connectPair,
    ]
  );

  /* =========================================================================
     DRAG START
     ========================================================================= */

  const handlePointerDown = useCallback(
    (
      event: React.PointerEvent<HTMLButtonElement>,
      leftId: number
    ) => {
      if (
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      /*
       * Remove button ustida bosilgan bo'lsa,
       * drag boshlanmaydi.
       */
      if (
        (event.target as HTMLElement).closest(
          '[data-action="remove"]'
        )
      ) {
        return;
      }

      const start =
        getConnectorPoint(
          event.currentTarget,
          "left"
        );

      if (!start) return;

      try {
        event.currentTarget.setPointerCapture(
          event.pointerId
        );
      } catch {}

      setSelectedLeftId(leftId);

      setDrag({
        leftId,
        start,
        current: start,
      });

      setHoveredRight(null);
    },
    [
      disabled,
      isSubmitting,
      result,
      getConnectorPoint,
    ]
  );

  /* =========================================================================
     FIND RIGHT UNDER POINTER
     ========================================================================= */

  const findRightUnderPointer = useCallback(
    (
      clientX: number,
      clientY: number
    ): number | null => {
      for (const pair of orderedRight) {
        const element =
          rightRefs.current[pair.id];

        if (!element) continue;

        const rect =
          element.getBoundingClientRect();

        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;

        if (inside) {
          return pair.id;
        }
      }

      return null;
    },
    [orderedRight]
  );

  /* =========================================================================
     DRAG MOVE
     ========================================================================= */

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (
        !drag ||
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      const current =
        getPointerPoint(event);

      if (!current) return;

      setDrag((previous) =>
        previous
          ? {
              ...previous,
              current,
            }
          : null
      );

      const rightId =
        findRightUnderPointer(
          event.clientX,
          event.clientY
        );

      setHoveredRight(rightId);
    },
    [
      drag,
      disabled,
      isSubmitting,
      result,
      getPointerPoint,
      findRightUnderPointer,
    ]
  );

  /* =========================================================================
     DRAG END
     ========================================================================= */

  const handlePointerUp = useCallback(() => {
    if (!drag) {
      setHoveredRight(null);
      return;
    }

    if (
      !disabled &&
      !isSubmitting &&
      !result &&
      hoveredRight !== null
    ) {
      connectPair(
        drag.leftId,
        hoveredRight
      );
    }

    setDrag(null);
    setHoveredRight(null);
    setSelectedLeftId(null);
  }, [
    drag,
    disabled,
    isSubmitting,
    result,
    hoveredRight,
    connectPair,
  ]);

  /* =========================================================================
     REMOVE CONNECTION
     ========================================================================= */

  const removeConnection = useCallback(
    (leftId: number) => {
      if (
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      soundEffects.playDisconnect();

      try {
        navigator.vibrate?.(15);
      } catch {}

      setConnections((previous) =>
        previous.filter(
          (connection) =>
            connection.leftId !== leftId
        )
      );

      setSelectedLeftId(null);
      setSelectedRightId(null);

      requestAnimationFrame(refreshLayout);
    },
    [
      disabled,
      isSubmitting,
      result,
      refreshLayout,
    ]
  );

  /* =========================================================================
     SHUFFLE
     ========================================================================= */

  const handleShuffle = useCallback(() => {
    if (
      disabled ||
      isSubmitting ||
      result
    ) {
      return;
    }

    soundEffects.playSelect();

    setOrderedRight((previous) => {
      const shuffled = [...previous];

      /*
       * Fisher-Yates.
       * Math.random sortdan ko'ra yaxshiroq.
       */
      for (
        let index = shuffled.length - 1;
        index > 0;
        index--
      ) {
        const randomIndex =
          Math.floor(
            Math.random() * (index + 1)
          );

        [
          shuffled[index],
          shuffled[randomIndex],
        ] = [
          shuffled[randomIndex],
          shuffled[index],
        ];
      }

      return shuffled;
    });

    requestAnimationFrame(refreshLayout);
  }, [
    disabled,
    isSubmitting,
    result,
    refreshLayout,
  ]);

  /* =========================================================================
     RESET
     ========================================================================= */

  const handleReset = useCallback(() => {
    if (
      disabled ||
      isSubmitting
    ) {
      return;
    }

    soundEffects.playDisconnect();

    setConnections([]);
    setSelectedLeftId(null);
    setSelectedRightId(null);

    setDrag(null);
    setHoveredRight(null);

    setResult(null);

    requestAnimationFrame(refreshLayout);
  }, [
    disabled,
    isSubmitting,
    refreshLayout,
  ]);

  /* =========================================================================
     COMPLETE
     ========================================================================= */

  const isComplete =
    pairsLeft.length > 0 &&
    pairsLeft.every((pair) =>
      connections.some(
        (connection) =>
          connection.leftId === pair.id
      )
    );

  /* =========================================================================
     SUBMIT
     ========================================================================= */

  const handleSubmit = useCallback(
    async () => {
      if (
        !isComplete ||
        disabled ||
        isSubmitting ||
        result
      ) {
        return;
      }

      setIsSubmitting(true);

      try {
        /*
         * Backend:
         *
         * answer_data = {
         *   "1": 5,
         *   "2": 3,
         *   "3": 1
         * }
         *
         * Flat object.
         */
        const answerData: Record<
          string,
          string | number
        > = {};

        connections.forEach(
          (connection) => {
            answerData[
              String(connection.leftId)
            ] = connection.rightId;
          }
        );

        const response =
          await onAnswerSubmit({
            answer_data: answerData,
          });

        setResult(response);

        if (response.correct) {
          soundEffects.playWin();

          try {
            confetti({
              particleCount: 100,
              spread: 75,
              origin: {
                y: 0.6,
              },
            });
          } catch {}
        } else {
          soundEffects.playError();
        }
      } catch (err) {
        if (onError) onError(err);
        else throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      onError,
      isComplete,
      disabled,
      isSubmitting,
      result,
      connections,
      onAnswerSubmit,
    ]
  );

  /* =========================================================================
     SOUND
     ========================================================================= */

  const toggleSound = useCallback(() => {
    const nextState = !soundEnabled;

    setSoundEnabled(nextState);

    soundEffects.enabled =
      nextState;
  }, [soundEnabled]);

  /* =========================================================================
     SVG CURVE
     ========================================================================= */

  const makeCurve = useCallback(
    (
      start: Point,
      end: Point
    ) => {
      const distance = Math.abs(
        end.x - start.x
      );

      const curve = Math.min(
        180,
        Math.max(
          20,
          distance * 0.42
        )
      );

      return `
        M ${start.x} ${start.y}
        C
          ${start.x + curve} ${start.y},
          ${end.x - curve} ${end.y},
          ${end.x} ${end.y}
      `;
    },
    []
  );

  /* =========================================================================
     RENDER
     ========================================================================= */

  return (
    <div
      id="matching-question-container"
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative w-full overflow-hidden select-none",
        "rounded-2xl border border-slate-200",
        "bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/20",
        "p-3 sm:p-4 md:p-5 lg:p-6"
      )}
      style={{
        touchAction: "none",
      }}
    >
      {/* Background effects */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 size-48 rounded-full bg-indigo-100/40 blur-3xl sm:size-64" />

        <div className="absolute -bottom-20 -left-20 size-48 rounded-full bg-violet-100/30 blur-3xl sm:size-64" />
      </div>

      {/* =====================================================================
          HEADER
          ===================================================================== */}

      <div className="relative z-40 mb-4 sm:mb-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          {instruction ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 sm:text-xs">
              <HelpCircle className="size-3.5 shrink-0 text-amber-600" />

              <span className="truncate">
                {instruction}
              </span>
            </span>
          ) : (
            <span />
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <button
              id="shuffle-btn"
              type="button"
              onClick={handleShuffle}
              disabled={
                disabled ||
                isSubmitting ||
                !!result
              }
              title="O'ng ustunni aralashtirish"
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-40 sm:text-xs"
            >
              <Shuffle className="size-3.5" />

              <span className="hidden sm:inline">
                Aralashtirish
              </span>
            </button>

            <button
              id="sound-toggle-btn"
              type="button"
              onClick={toggleSound}
              title={
                soundEnabled
                  ? "Ovozni o'chirish"
                  : "Ovozni yoqish"
              }
              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200"
            >
              {soundEnabled ? (
                <Volume2 className="size-3.5 text-indigo-600" />
              ) : (
                <VolumeX className="size-3.5 text-slate-400" />
              )}
            </button>
          </div>
        </div>

        {/* Question */}

        <div
          id="question-title"
          className="text-sm font-bold leading-snug text-slate-900 sm:text-base md:text-lg lg:text-xl"
        >
          <MarkdownRenderer
            content={text}
            inline={false}
          />
        </div>

        {/* Progress */}

        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              animate={{
                width: `${
                  pairsLeft.length
                    ? Math.min(
                        100,
                        (connections.length /
                          pairsLeft.length) *
                          100
                      )
                    : 0
                }%`,
              }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 25,
              }}
            />
          </div>

          <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-600 sm:text-xs">
            {connections.length}/
            {pairsLeft.length}
          </span>
        </div>

        {/* Help */}

        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500 sm:text-xs">
          <span className="flex min-w-0 items-center gap-1">
            <Smartphone className="size-3 shrink-0 text-indigo-500" />

            <span className="truncate">
              Bosib tanlang yoki sudrab ulang
            </span>
          </span>

          {connections.length > 0 &&
            !result && (
              <button
                type="button"
                onClick={handleReset}
                className="shrink-0 font-medium text-rose-600 underline underline-offset-2 hover:text-rose-700"
              >
                Tozalash
              </button>
            )}
        </div>
      </div>

      {/* =====================================================================
          MATCHING BOARD
          LEFT | GAP | RIGHT
          ===================================================================== */}

      <div
        id="matching-grid-board"
        className={cn(
          "relative z-20 grid w-full items-stretch",
          "grid-cols-[minmax(0,1fr)_18px_minmax(0,1fr)]",
          "sm:grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)]",
          "md:grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)]",
          "lg:grid-cols-[minmax(0,1fr)_72px_minmax(0,1fr)]"
        )}
      >
        {/* ===================================================================
            LEFT
            =================================================================== */}

        <div
          id="left-column"
          className="min-w-0 space-y-2 sm:space-y-2.5 md:space-y-3"
        >
          <div className="flex items-center justify-between gap-1 px-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 sm:text-[10px] md:text-xs">
              Chap
            </span>

            <span className="hidden rounded bg-indigo-50 px-1.5 py-0.5 text-[8px] font-bold text-indigo-600 sm:inline">
              ULANISH
            </span>
          </div>

          {pairsLeft.map(
            (pair, index) => {
              const connection =
                getLeftConnection(
                  pair.id
                );

              const isMatched =
                !!connection;

              const isSelected =
                selectedLeftId ===
                pair.id;

              const isDragging =
                drag?.leftId ===
                pair.id;

              const color =
                MATCH_COLORS[
                  (
                    connection
                      ?.colorIndex ??
                    index
                  ) %
                    MATCH_COLORS.length
                ];

              return (
                <motion.button
                  key={pair.id}
                  id={`left-item-${pair.id}`}
                  ref={(element) => {
                    leftRefs.current[
                      pair.id
                    ] = element;
                  }}
                  type="button"
                  disabled={
                    disabled ||
                    isSubmitting ||
                    !!result
                  }
                  onClick={() =>
                    handleLeftCardTap(
                      pair.id
                    )
                  }
                  onPointerDown={(event) =>
                    handlePointerDown(
                      event,
                      pair.id
                    )
                  }
                  whileHover={{
                    scale:
                      disabled ||
                      result
                        ? 1
                        : 1.01,
                  }}
                  whileTap={{
                    scale:
                      disabled ||
                      result
                        ? 1
                        : 0.985,
                  }}
                  animate={{
                    scale:
                      isDragging ||
                      isSelected
                        ? 1.015
                        : 1,

                    boxShadow:
                      isDragging ||
                      isSelected
                        ? `0 8px 24px ${color.glow}`
                        : "0 1px 5px rgba(15,23,42,.05)",
                  }}
                  className={cn(
                    "relative flex w-full min-w-0 items-center justify-between text-left",
                    "min-h-[48px] sm:min-h-[56px] md:min-h-[62px]",
                    "rounded-xl border-2 sm:rounded-2xl",
                    "px-2 py-1.5 sm:px-3 sm:py-2.5",
                    "transition-colors duration-150",
                    "cursor-pointer active:cursor-grabbing",

                    isSelected &&
                      "border-indigo-400 bg-indigo-50/70 ring-2 ring-indigo-400 ring-offset-1",

                    !isSelected &&
                      isMatched &&
                      `${color.bg} ${color.border}`,

                    !isSelected &&
                      !isMatched &&
                      "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50",

                    disabled &&
                      "cursor-not-allowed opacity-60"
                  )}
                >
                  {/* LEFT CONTENT */}

                  <div className="flex min-w-0 flex-1 items-center gap-1.5 pr-1.5 sm:gap-2.5">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md text-[9px] font-black sm:size-7 sm:text-xs",
                        isMatched
                          ? `${color.text} bg-white`
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1 overflow-hidden text-[11px] font-medium leading-tight text-slate-800 sm:text-xs md:text-sm">
                      <MarkdownRenderer
                        content={pair.txt}
                        inline
                      />
                    </div>
                  </div>

                  {/* CONNECTOR */}

                  <div
                    data-connector="left"
                    className="relative z-40 ml-1 flex size-5 shrink-0 items-center justify-center sm:size-6"
                  >
                    <span
                      className="size-2.5 rounded-full border-2 transition-all sm:size-3"
                      style={
                        isMatched
                          ? {
                              backgroundColor:
                                color.stroke,
                              borderColor:
                                "#ffffff",
                              boxShadow: `0 0 0 2px ${color.stroke}`,
                            }
                          : isSelected
                          ? {
                              backgroundColor:
                                "#6366f1",
                              borderColor:
                                "#ffffff",
                              boxShadow:
                                "0 0 0 3px rgba(99,102,241,.35)",
                            }
                          : {
                              backgroundColor:
                                "#ffffff",
                              borderColor:
                                "#94a3b8",
                            }
                      }
                    />
                  </div>

                  {/* REMOVE
                      button ichida button bo'lmasligi uchun
                      bu joyda div ishlatamiz.
                  */}

                  {isMatched &&
                    !result && (
                      <span
                        data-action="remove"
                        role="button"
                        tabIndex={0}
                        title="Bog'lanishni uzish"
                        onPointerDown={(
                          event
                        ) => {
                          event.stopPropagation();
                        }}
                        onClick={(
                          event
                        ) => {
                          event.stopPropagation();
                          event.preventDefault();

                          removeConnection(
                            pair.id
                          );
                        }}
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();
                            removeConnection(
                              pair.id
                            );
                          }
                        }}
                        className="absolute -left-1.5 -top-1.5 z-50 flex size-5 cursor-pointer items-center justify-center rounded-full bg-white text-slate-400 shadow-md ring-1 ring-slate-200 transition hover:text-rose-600 active:scale-90"
                      >
                        <X className="size-3 stroke-[3]" />
                      </span>
                    )}
                </motion.button>
              );
            }
          )}
        </div>

        {/* ===================================================================
            CENTER
            =================================================================== */}

        <div
          id="center-bridge"
          className="pointer-events-none relative flex items-center justify-center"
        >
          <div className="hidden flex-col items-center gap-1 opacity-70 md:flex">
            <div className="flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <Link2 className="size-4 text-indigo-500" />
            </div>

            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              ULASH
            </span>
          </div>
        </div>

        {/* ===================================================================
            RIGHT
            =================================================================== */}

        <div
          id="right-column"
          className="min-w-0 space-y-2 sm:space-y-2.5 md:space-y-3"
        >
          <div className="flex items-center justify-between gap-1 px-0.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 sm:text-[10px] md:text-xs">
              O'ng
            </span>

            <span className="hidden rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-600 sm:inline">
              JAVOB
            </span>
          </div>

          {orderedRight.map(
            (pair) => {
              const connection =
                getRightConnection(
                  pair.id
                );

              const isMatched =
                !!connection;

              const isSelected =
                selectedRightId ===
                pair.id;

              const isHovered =
                hoveredRight ===
                pair.id;

              const color =
                connection
                  ? MATCH_COLORS[
                      connection.colorIndex %
                        MATCH_COLORS.length
                    ]
                  : null;

              return (
                <motion.button
                  key={pair.id}
                  id={`right-item-${pair.id}`}
                  ref={(element) => {
                    rightRefs.current[
                      pair.id
                    ] = element;
                  }}
                  type="button"
                  disabled={
                    disabled ||
                    isSubmitting ||
                    !!result
                  }
                  onClick={() =>
                    handleRightCardTap(
                      pair.id
                    )
                  }
                  whileHover={{
                    scale:
                      disabled ||
                      result
                        ? 1
                        : 1.01,
                  }}
                  whileTap={{
                    scale:
                      disabled ||
                      result
                        ? 1
                        : 0.985,
                  }}
                  animate={{
                    scale:
                      isHovered ||
                      isSelected
                        ? 1.015
                        : 1,
                  }}
                  className={cn(
                    "relative flex w-full min-w-0 items-center justify-between text-left",
                    "min-h-[48px] sm:min-h-[56px] md:min-h-[62px]",
                    "rounded-xl border-2 sm:rounded-2xl",
                    "px-2 py-1.5 sm:px-3 sm:py-2.5",
                    "transition-colors duration-150",
                    "cursor-pointer",

                    isSelected &&
                      "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-400 ring-offset-1",

                    !isSelected &&
                      isMatched &&
                      `${color?.bg} ${color?.border}`,

                    !isSelected &&
                      !isMatched &&
                      isHovered &&
                      "border-indigo-400 bg-indigo-50 shadow-md",

                    !isSelected &&
                      !isMatched &&
                      !isHovered &&
                      "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50",

                    disabled &&
                      "cursor-not-allowed opacity-60"
                  )}
                >
                  {/* CONNECTOR */}

                  <div
                    data-connector="right"
                    className="relative z-40 mr-1 flex size-5 shrink-0 items-center justify-center sm:size-6"
                  >
                    <span
                      className="size-2.5 rounded-full border-2 transition-all sm:size-3"
                      style={
                        isMatched
                          ? {
                              backgroundColor:
                                color?.stroke,
                              borderColor:
                                "#ffffff",
                              boxShadow: `0 0 0 2px ${color?.stroke}`,
                            }
                          : isHovered ||
                            isSelected
                          ? {
                              backgroundColor:
                                "#10b981",
                              borderColor:
                                "#ffffff",
                              boxShadow:
                                "0 0 0 3px rgba(16,185,129,.35)",
                            }
                          : {
                              backgroundColor:
                                "#ffffff",
                              borderColor:
                                "#94a3b8",
                            }
                      }
                    />
                  </div>

                  {/* TEXT */}

                  <div className="min-w-0 flex-1 overflow-hidden text-[11px] font-medium leading-tight text-slate-800 sm:text-xs md:text-sm">
                    <MarkdownRenderer
                      content={pair.txt}
                      inline
                    />
                  </div>

                  {/* MATCHED ICON */}

                  {isMatched && (
                    <span
                      className="ml-1 flex size-5 shrink-0 items-center justify-center rounded-md bg-white text-xs font-black shadow-sm sm:size-6"
                      style={{
                        color:
                          color?.stroke,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </motion.button>
              );
            }
          )}
        </div>
      </div>

      {/* =====================================================================
          SVG CONNECTORS
          ===================================================================== */}

      <svg
        id="connections-svg-canvas"
        className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {MATCH_COLORS.map(
            (color, index) => (
              <filter
                key={index}
                id={`match-glow-${index}`}
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur
                  stdDeviation="2.5"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            )
          )}

          <linearGradient
            id="active-drag-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset="0%"
              stopColor="#6366f1"
            />

            <stop
              offset="100%"
              stopColor="#8b5cf6"
            />
          </linearGradient>
        </defs>

        {/* Saved connections */}

        {connections.map(
          (connection) => {
            const start =
              getConnectorPoint(
                leftRefs.current[
                  connection.leftId
                ],
                "left"
              );

            const end =
              getConnectorPoint(
                rightRefs.current[
                  connection.rightId
                ],
                "right"
              );

            if (!start || !end) {
              return null;
            }

            const color =
              MATCH_COLORS[
                connection.colorIndex %
                  MATCH_COLORS.length
              ];

            const path =
              makeCurve(
                start,
                end
              );

            return (
              <g
                key={`${connection.leftId}-${connection.rightId}`}
              >
                {/* Glow */}

                <path
                  d={path}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.14"
                  filter={`url(#match-glow-${
                    connection.colorIndex %
                    MATCH_COLORS.length
                  })`}
                />

                {/* Main line */}

                <motion.path
                  d={path}
                  fill="none"
                  stroke={color.stroke}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{
                    pathLength: 0,
                  }}
                  animate={{
                    pathLength: 1,
                  }}
                  transition={{
                    duration: 0.25,
                    ease: "easeOut",
                  }}
                />

                {/* Start point */}

                <circle
                  cx={start.x}
                  cy={start.y}
                  r="3"
                  fill={color.stroke}
                />

                {/* End point */}

                <circle
                  cx={end.x}
                  cy={end.y}
                  r="3"
                  fill={color.stroke}
                />
              </g>
            );
          }
        )}

        {/* Active drag line */}

        {drag && (
          <path
            d={makeCurve(
              drag.start,
              drag.current
            )}
            fill="none"
            stroke="url(#active-drag-grad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5 5"
            opacity="0.9"
          />
        )}
      </svg>

      {/* =====================================================================
          SELECTION MESSAGE
          ===================================================================== */}

      <AnimatePresence>
        {(selectedLeftId !== null ||
          selectedRightId !== null) &&
          !drag &&
          !result && (
            <motion.div
              initial={{
                opacity: 0,
                y: 6,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 6,
              }}
              className="relative z-40 mt-3 flex items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-[10px] font-semibold text-indigo-800 sm:text-xs"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-indigo-600" />

                <span className="truncate">
                  {selectedLeftId !==
                  null
                    ? "O'ng ustundan mos javobni tanlang"
                    : "Chap ustundan mos savolni tanlang"}
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedLeftId(
                    null
                  );
                  setSelectedRightId(
                    null
                  );
                }}
                className="shrink-0 text-[10px] text-slate-500 underline hover:text-slate-800"
              >
                Bekor qilish
              </button>
            </motion.div>
          )}
      </AnimatePresence>

      {/* =====================================================================
          ACTIONS
          ===================================================================== */}

      {!result ? (
        <div className="relative z-40 mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {connections.length > 0 && (
            <button
              id="reset-connections-btn"
              type="button"
              onClick={handleReset}
              disabled={
                disabled ||
                isSubmitting
              }
              className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 sm:w-auto"
            >
              <RotateCcw className="size-3.5" />

              Qaytadan
            </button>
          )}

          <motion.button
            id="submit-answer-btn"
            type="button"
            disabled={
              !isComplete ||
              disabled ||
              isSubmitting
            }
            onClick={handleSubmit}
            whileHover={{
              scale:
                isComplete &&
                !isSubmitting
                  ? 1.01
                  : 1,
            }}
            whileTap={{
              scale:
                isComplete &&
                !isSubmitting
                  ? 0.98
                  : 1,
            }}
            className={cn(
              "flex h-10 w-full flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold text-white shadow-md transition sm:h-11 sm:text-sm",

              isComplete
                ? "bg-slate-900 hover:bg-slate-800 active:scale-[0.99]"
                : "cursor-not-allowed bg-slate-300 opacity-80"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />

                Tekshirilmoqda...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />

                {isComplete
                  ? "Javobni tekshirish"
                  : `Barcha juftliklarni ulang (${connections.length}/${pairsLeft.length})`}
              </>
            )}
          </motion.button>
        </div>
      ) : (
        /* ===================================================================
           RESULT
           =================================================================== */

        <AnimatePresence>
          <motion.div
            id="result-feedback-card"
            initial={{
              opacity: 0,
              y: 10,
              scale: 0.98,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            className={cn(
              "relative z-40 mt-4 rounded-xl border-2 p-3.5 shadow-sm sm:rounded-2xl sm:p-5",

              result.correct
                ? "border-emerald-300/80 bg-gradient-to-br from-emerald-50/90 to-teal-50/50"
                : "border-rose-300/80 bg-gradient-to-br from-rose-50/90 to-orange-50/40"
            )}
          >
            {result.correct && (
              <div className="absolute -right-2 -top-3 flex size-9 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-md sm:size-11">
                <Trophy className="size-4 sm:size-5" />
              </div>
            )}

            <div className="flex items-start gap-2.5 sm:gap-3">
              {result.correct ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 sm:size-6" />
              ) : (
                <XCircle className="mt-0.5 size-5 shrink-0 text-rose-600 sm:size-6" />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={cn(
                      "text-sm font-black sm:text-base",

                      result.correct
                        ? "text-emerald-950"
                        : "text-rose-950"
                    )}
                  >
                    {result.correct
                      ? "Ajoyib natija! 🎉"
                      : "Xatolik mavjud!"}
                  </h4>

                  {result.xp > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/70 bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                      +{result.xp} XP
                    </span>
                  )}
                </div>

                <p
                  className={cn(
                    "mt-1 text-xs font-medium sm:text-sm",

                    result.correct
                      ? "text-emerald-800"
                      : "text-rose-800"
                  )}
                >
                  {result.correct
                    ? "Barcha juftliklar to'g'ri topildi."
                    : "Ayrim juftliklar noto'g'ri tanlangan."}
                </p>

                {(result.explanation ||
                  explanation) && (
                  <div className="mt-3 rounded-lg border border-black/5 bg-white/70 p-2.5 text-[11px] text-slate-700 sm:text-xs">
                    <span className="mb-1 block font-bold text-slate-900">
                      Izoh:
                    </span>

                    <MarkdownRenderer
                      content={
                        result.explanation ||
                        explanation ||
                        ""
                      }
                      inline={false}
                    />
                  </div>
                )}

                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
                  >
                    <RotateCcw className="size-3.5" />

                    Qaytadan urinish
                  </button>

                  {hasNextQuestion &&
                    onNextQuestion && (
                      <button
                        type="button"
                        onClick={
                          onNextQuestion
                        }
                        className="ml-auto flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
                      >
                        Keyingi savol →
                      </button>
                    )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export default MatchingQuestion;
