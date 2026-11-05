"use client";

import { backendRequest } from "@/lib/api/django/backend";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Columns2,
  Crown,
  Flame,
  Hourglass,
  List,
  Loader2,
  Maximize2,
  Menu,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Rows3,
  Settings,
  Shuffle,
  Sparkles,
  SquareArrowLeft,
  Timer,
  Users,
  X,
  User as UserIcon,
  FileQuestion,
  Moon,
  Sun,
  SlidersHorizontal,
  Globe,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useAccessibility } from "@/context/AccessibilityContext";
import { ProblemsListSheet } from "./problems-list-sheet";

// ============================================================
// TURLAR
// ============================================================

export type WorkspaceLayout =
  | "standard"
  | "stacked"
  | "focus";

interface ProblemNavbarProps {
  slug: string;

  onRun?: () => void;
  onSubmit?: () => void;

  isRunning?: boolean;
  isSubmitting?: boolean;

  streakCount?: number;

  onPrev?: () => void;
  onNext?: () => void;
  onRandom?: () => void;

  isNavigating?: boolean;
  hasPrev?: boolean;
  hasNext?: boolean;

  onAction?: (label: string) => void;

  layout?: WorkspaceLayout;
  onLayoutChange?: (layout: WorkspaceLayout) => void;
}

// ============================================================
// TIMER TYPES
// ============================================================

type TimerMode = "stopwatch" | "timer";

interface TimerState {
  mode: TimerMode;
  running: boolean;
  seconds: number;
  timerDuration: number;
  startedAt: number | null;
}

// ============================================================
// TIMER STORAGE
// ============================================================

function getTimerStorageKey(slug: string) {
  return `problem-navbar-timer:${slug}`;
}

// ============================================================
// YORDAMCHI ICON BUTTON
// ============================================================

function IconButton({
  label,
  active,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors",
        "hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        "dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
        active &&
          "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ============================================================
// CLOCK FORMAT
// ============================================================

function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));

  const pad = (n: number) =>
    String(n).padStart(2, "0");

  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  return hh > 0
    ? `${pad(hh)}:${pad(mm)}:${pad(ss)}`
    : `${pad(mm)}:${pad(ss)}`;
}

// ============================================================
// TIME INPUT
// ============================================================

function TimeInput({
  value,
  onChange,
  suffix,
}: {
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => {
          const value = e.target.value
            .replace(/\D/g, "")
            .slice(0, 2);

          onChange(value);
        }}
        onBlur={() => {
          onChange(value.padStart(2, "0"));
        }}
        inputMode="numeric"
        className="
          w-16
          rounded-lg
          border
          border-neutral-200
          bg-white
          py-2
          text-center
          font-mono
          text-xl
          font-bold
          tabular-nums
          text-neutral-800
          outline-none
          transition-colors
          focus:border-blue-500
          dark:border-neutral-700
          dark:bg-neutral-900
          dark:text-neutral-100
        "
        aria-label={suffix}
      />

      <span className="text-xs text-neutral-400">
        {suffix}
      </span>
    </div>
  );
}

// ============================================================
// TIMER SECTION
// ============================================================

function TimerSection({
  state,
  onChange,
  onAction,
}: {
  state: TimerState;
  onChange: (state: TimerState) => void;
  onAction?: (label: string) => void;
}) {
  const {
    mode,
    running,
    seconds,
    timerDuration,
  } = state;

  const [h, setH] = useState(
    String(
      Math.floor(timerDuration / 3600)
    ).padStart(2, "0")
  );

  const [min, setMin] = useState(
    String(
      Math.floor(
        (timerDuration % 3600) / 60
      )
    ).padStart(2, "0")
  );

  useEffect(() => {
    if (running) return;

    setH(
      String(
        Math.floor(timerDuration / 3600)
      ).padStart(2, "0")
    );

    setMin(
      String(
        Math.floor(
          (timerDuration % 3600) / 60
        )
      ).padStart(2, "0")
    );
  }, [timerDuration, running]);

  // ----------------------------------------------------------
  // RESET
  // ----------------------------------------------------------

  const reset = () => {
    onChange({
      ...state,
      running: false,
      seconds: 0,
      startedAt: null,
    });
  };

  // ----------------------------------------------------------
  // STOP
  // ----------------------------------------------------------

  const stop = () => {
    onChange({
      ...state,
      running: false,
      startedAt: null,
    });
  };

  // ----------------------------------------------------------
  // MODE SWITCH
  // ----------------------------------------------------------

  const switchMode = (newMode: TimerMode) => {
    onChange({
      ...state,
      mode: newMode,
      running: false,
      seconds: 0,
      startedAt: null,
    });
  };

  // ----------------------------------------------------------
  // STOPWATCH START
  // ----------------------------------------------------------

  const startStopwatch = () => {
    onChange({
      mode: "stopwatch",
      running: true,
      seconds: 0,
      timerDuration: state.timerDuration,
      startedAt: Date.now(),
    });
  };

  // ----------------------------------------------------------
  // TIMER START
  // ----------------------------------------------------------

  const startTimer = () => {
    const hours =
      parseInt(h, 10) || 0;

    const minutes =
      parseInt(min, 10) || 0;

    const total =
      hours * 3600 +
      minutes * 60;

    if (total <= 0) {
      onAction?.(
        "⚠️ Taymer uchun vaqt kiriting"
      );
      return;
    }

    onChange({
      mode: "timer",
      running: true,
      seconds: total,
      timerDuration: total,
      startedAt: Date.now(),
    });
  };

  // ----------------------------------------------------------
  // TOGGLE
  // ----------------------------------------------------------

  const toggle = () => {
    if (running) {
      stop();
      return;
    }

    if (mode === "stopwatch") {
      startStopwatch();
    } else {
      startTimer();
    }
  };

  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------

  const updateHours = (value: string) => {
    setH(value);

    const hours =
      parseInt(value, 10) || 0;

    const minutes =
      parseInt(min, 10) || 0;

    onChange({
      ...state,
      timerDuration:
        hours * 3600 +
        minutes * 60,
    });
  };

  const updateMinutes = (value: string) => {
    setMin(value);

    const hours =
      parseInt(h, 10) || 0;

    const minutes =
      parseInt(value, 10) || 0;

    onChange({
      ...state,
      timerDuration:
        hours * 3600 +
        minutes * 60,
    });
  };

  const danger =
    mode === "timer" &&
    running &&
    seconds <= 10 &&
    seconds > 0;

  return (
    <div className="w-full">
      {/* ======================================================
          MODE
      ====================================================== */}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            switchMode("stopwatch")
          }
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all",
            mode === "stopwatch"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
              : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          )}
        >
          <Timer
            className={cn(
              "size-5",
              mode === "stopwatch"
                ? "text-blue-600 dark:text-blue-400"
                : "text-neutral-400"
            )}
          />

          <span
            className={cn(
              "text-xs font-semibold",
              mode === "stopwatch"
                ? "text-blue-700 dark:text-blue-400"
                : "text-neutral-500"
            )}
          >
            Sekundomer
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            switchMode("timer")
          }
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-all",
            mode === "timer"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
              : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          )}
        >
          <Hourglass
            className={cn(
              "size-5",
              mode === "timer"
                ? "text-blue-600 dark:text-blue-400"
                : "text-neutral-400"
            )}
          />

          <span
            className={cn(
              "text-xs font-semibold",
              mode === "timer"
                ? "text-blue-700 dark:text-blue-400"
                : "text-neutral-500"
            )}
          >
            Taymer
          </span>
        </button>
      </div>

      {/* ======================================================
          TIMER INPUT
      ====================================================== */}

      {mode === "timer" && !running && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <TimeInput
            value={h}
            onChange={updateHours}
            suffix="soat"
          />

          <TimeInput
            value={min}
            onChange={updateMinutes}
            suffix="daq"
          />
        </div>
      )}

      {/* ======================================================
          DISPLAY
      ====================================================== */}

      <p
        className={cn(
          "py-3 text-center font-mono text-3xl font-bold tabular-nums tracking-wide transition-colors",
          danger
            ? "text-red-500"
            : "text-neutral-800 dark:text-neutral-100"
        )}
      >
        {formatClock(seconds)}
      </p>

      {/* ======================================================
          CONTROLS
      ====================================================== */}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]",
            running
              ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
              : "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          )}
        >
          {running ? (
            <>
              <Pause className="size-4" />
              To'xtatish
            </>
          ) : (
            <>
              <Play className="size-4" />
              {mode === "stopwatch"
                ? "Sekundomerni boshlash"
                : "Taymerni boshlash"}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={reset}
          aria-label="Qayta o'rnatish"
          className="
            flex
            size-10
            shrink-0
            items-center
            justify-center
            rounded-lg
            border
            border-neutral-200
            text-neutral-500
            transition-colors
            hover:bg-neutral-50
            dark:border-neutral-700
            dark:hover:bg-neutral-800
          "
        >
          <RotateCcw className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// LAYOUT OPTIONS
// ============================================================

const LAYOUT_OPTIONS: {
  id: WorkspaceLayout;
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  desc: string;
}[] = [
  {
    id: "standard",
    icon: Columns2,
    title: "Standart",
    desc: "Tavsif chapda, kod o'ngda",
  },
  {
    id: "stacked",
    icon: Rows3,
    title: "Tik joylashuv",
    desc: "Tavsif, kod va testlar ustma-ust",
  },
  {
    id: "focus",
    icon: Maximize2,
    title: "Diqqat rejimi",
    desc: "Sarlavha yashirilgan, butun ekran kod",
  },
];

// ============================================================
// LAYOUT SECTION
// ============================================================

export function LayoutSection({
  value,
  onChange,
}: {
  value: WorkspaceLayout;
  onChange: (layout: WorkspaceLayout) => void;
}) {
  return (
    <div className="space-y-1">
      {LAYOUT_OPTIONS.map((option) => {
        const active =
          value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() =>
              onChange(option.id)
            }
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
              active
                ? "border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30"
                : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                active
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                  : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
              )}
            >
              <option.icon className="size-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-sm font-semibold",
                  active
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-neutral-800 dark:text-neutral-100"
                )}
              >
                {option.title}
              </span>

              <span className="block truncate text-xs text-neutral-400">
                {option.desc}
              </span>
            </span>

            {active && (
              <CheckCircle2 className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================
// PREMIUM
// ============================================================

function usePremiumStatus(
  isAuthenticated: boolean
) {
  const [isPremium, setIsPremium] =
    useState<boolean | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsPremium(false);
      return;
    }

    let cancelled = false;

    backendRequest("/api/subscriptions/me", {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setIsPremium(
            Boolean(data?.is_premium)
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsPremium(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return isPremium;
}

// ============================================================
// USER PROFILE POPOVER
// ============================================================

function UserProfilePopover({
  user,
  isPremium,
  onClose,
}: {
  user: {
    username?: string | null;
    fullName?: string | null;
    phone?: string | null;
    telegramId?: string | number | null;
  };
  isPremium: boolean | null;
  onClose?: () => void;
}) {
  const {
    setIsOpen: setAccessibilityOpen,
    language,
    setLanguage,
    darkMode,
    toggleDarkMode,
  } = useAccessibility();
  const { logout } = useAuth();

  const displayName =
    user.fullName?.trim() ||
    user.username ||
    "Foydalanuvchi";

  const username =
    user.username?.trim();

  return (
    <div
      className="
        absolute
        right-0
        top-10
        z-50
        w-[280px]
        overflow-hidden
        rounded-2xl
        border
        border-neutral-200
        bg-white
        shadow-2xl
        dark:border-neutral-700
        dark:bg-neutral-900
      "
    >
      {/* ======================================================
          PROFILE HEADER
      ====================================================== */}

      <div
        className="
          border-b
          border-neutral-100
          bg-neutral-50/60
          p-3.5
          dark:border-neutral-800
          dark:bg-neutral-900
        "
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div
            className="
              flex
              size-10
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-orange-100
              text-sm
              font-bold
              text-orange-600
              dark:bg-orange-950
              dark:text-orange-400
            "
          >
            {user.username
              ?.slice(0, 1)
              .toUpperCase() ?? "?"}
          </div>

          {/* Name */}
          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-sm
                font-bold
                text-neutral-900
                dark:text-neutral-100
              "
            >
              {displayName}
            </p>

            {username ? (
              <p
                className="
                  truncate
                  text-xs
                  text-neutral-400
                "
              >
                @{username}
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                Foydalanuvchi
              </p>
            )}
          </div>

          {/* Premium badge */}
          {isPremium === true && (
            <span
              className="
                flex
                shrink-0
                items-center
                gap-1
                rounded-full
                bg-emerald-100
                px-2
                py-0.5
                text-[10px]
                font-bold
                text-emerald-700
                dark:bg-emerald-950
                dark:text-emerald-400
              "
            >
              <CheckCircle2 className="size-3" />
              PRO
            </span>
          )}
        </div>
      </div>

      {/* ======================================================
          MENU ITEMS (MATCHING SCREENSHOT 5)
      ====================================================== */}

      <div className="p-1.5 space-y-0.5 text-sm">
        {/* Profile */}
        <Link
          href={`/user/${user.username || ""}`}
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <UserIcon className="size-4 text-neutral-400" />
          <span>Profile</span>
        </Link>

        {/* My reports */}
        <Link
          href="/faq"
          onClick={onClose}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <FileQuestion className="size-4 text-neutral-400" />
          <span>My reports</span>
        </Link>

        {/* Switch to dark mode */}
        <button
          type="button"
          onClick={() => toggleDarkMode()}
          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <span className="flex items-center gap-2.5">
            {darkMode ? (
              <Sun className="size-4 text-amber-500" />
            ) : (
              <Moon className="size-4 text-neutral-400" />
            )}
            <span>{darkMode ? "Switch to light mode" : "Switch to dark mode"}</span>
          </span>
          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {darkMode ? "Light" : "Dark"}
          </span>
        </button>

        {/* Accessibility */}
        <button
          type="button"
          onClick={() => {
            onClose?.();
            setAccessibilityOpen(true);
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <SlidersHorizontal className="size-4 text-neutral-400" />
          <span>Accessibility</span>
        </button>

        {/* Change language */}
        <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
          <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Globe className="size-3.5" />
              <span>Change language</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
              {language}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(["UZ", "RU", "EN", "QQ"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  "rounded-md py-1 text-center font-mono text-xs font-bold transition-all",
                  language === lang
                    ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />

        {/* Log out */}
        <button
          type="button"
          onClick={() => {
            onClose?.();
            logout();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// USER INFO ROW
// ============================================================

function UserInfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-10
        items-center
        justify-between
        gap-4
        rounded-lg
        px-3
        py-2
        transition-colors
        hover:bg-neutral-50
        dark:hover:bg-neutral-800
      "
    >
      <span
        className="
          shrink-0
          text-xs
          text-neutral-400
        "
      >
        {label}
      </span>

      <span
        className={cn(
          "max-w-[180px] truncate text-right text-sm font-medium text-neutral-800 dark:text-neutral-100",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// ASOSIY NAVBAR
// ============================================================

export function ProblemNavbar({
  slug,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  streakCount = 0,
  onPrev,
  onNext,
  onRandom,
  isNavigating,
  hasPrev = true,
  hasNext = true,
  onAction,
  layout = "standard",
  onLayoutChange,
}: ProblemNavbarProps) {
  const {
    user,
    isAuthenticated,
  } = useAuth();

  const {
    setIsOpen: setAccessibilityOpen,
    language,
    setLanguage,
    darkMode,
    toggleDarkMode,
  } = useAccessibility();

  const [problemsListOpen, setProblemsListOpen] =
    useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [timerOpen, setTimerOpen] =
    useState(false);

  const [layoutOpen, setLayoutOpen] =
    useState(false);

  // ==========================================================
  // USER MENU
  // ==========================================================

  const [userMenuOpen, setUserMenuOpen] =
    useState(false);

  // ==========================================================
  // TIMER STATE
  // ==========================================================

  const [timerState, setTimerState] =
    useState<TimerState>({
      mode: "stopwatch",
      running: false,
      seconds: 0,
      timerDuration: 30 * 60,
      startedAt: null,
    });

  const [timerHydrated, setTimerHydrated] =
    useState(false);

  const timerStorageKey =
    getTimerStorageKey(slug);

  const isPremium =
    usePremiumStatus(isAuthenticated);

  const timerRef =
    useRef<HTMLDivElement>(null);

  const layoutRef =
    useRef<HTMLDivElement>(null);

  const userMenuRef =
    useRef<HTMLDivElement>(null);

  // ==========================================================
  // TIMER: RESTORE
  // ==========================================================

  useEffect(() => {
    setTimerHydrated(false);

    try {
      const saved =
        localStorage.getItem(
          timerStorageKey
        );

      if (!saved) {
        setTimerState({
          mode: "stopwatch",
          running: false,
          seconds: 0,
          timerDuration: 30 * 60,
          startedAt: null,
        });

        setTimerHydrated(true);
        return;
      }

      const parsed =
        JSON.parse(saved) as Partial<TimerState>;

      if (
        parsed &&
        (parsed.mode === "timer" ||
          parsed.mode === "stopwatch")
      ) {
        setTimerState({
          mode: parsed.mode,
          running: Boolean(parsed.running),
          seconds:
            typeof parsed.seconds === "number"
              ? parsed.seconds
              : 0,
          timerDuration:
            typeof parsed.timerDuration ===
            "number"
              ? parsed.timerDuration
              : 30 * 60,
          startedAt:
            typeof parsed.startedAt ===
            "number"
              ? parsed.startedAt
              : null,
        });
      }
    } catch {
      localStorage.removeItem(
        timerStorageKey
      );
    }

    setTimerHydrated(true);
  }, [timerStorageKey]);

  // ==========================================================
  // TIMER: SAVE
  // ==========================================================

  useEffect(() => {
    if (!timerHydrated) return;

    try {
      localStorage.setItem(
        timerStorageKey,
        JSON.stringify(timerState)
      );
    } catch {
      // Ignore
    }
  }, [
    timerState,
    timerStorageKey,
    timerHydrated,
  ]);

  // ==========================================================
  // TIMER ENGINE
  // ==========================================================

  useEffect(() => {
    if (!timerHydrated) return;

    if (
      !timerState.running ||
      !timerState.startedAt
    ) {
      return;
    }

    let completed = false;

    const updateTimer = () => {
      const startedAt =
        timerState.startedAt;

      if (!startedAt) return;

      const elapsed = Math.floor(
        (Date.now() - startedAt) / 1000
      );

      // STOPWATCH
      if (
        timerState.mode === "stopwatch"
      ) {
        setTimerState((prev) => ({
          ...prev,
          seconds: elapsed,
        }));

        return;
      }

      // TIMER
      const remaining = Math.max(
        0,
        timerState.timerDuration -
          elapsed
      );

      if (remaining <= 0) {
        if (!completed) {
          completed = true;

          setTimerState((prev) => ({
            ...prev,
            running: false,
            seconds: 0,
            startedAt: null,
          }));

          onAction?.(
            "⏰ Taymer tugadi"
          );
        }

        return;
      }

      setTimerState((prev) => ({
        ...prev,
        seconds: remaining,
      }));
    };

    updateTimer();

    const interval =
      window.setInterval(
        updateTimer,
        250
      );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    timerHydrated,
    timerState.running,
    timerState.startedAt,
    timerState.mode,
    timerState.timerDuration,
    onAction,
  ]);

  // ==========================================================
  // OUTSIDE CLICK
  // ==========================================================

  useEffect(() => {
    function handleClick(
      event: MouseEvent
    ) {
      const target =
        event.target as Node;

      if (
        timerRef.current &&
        !timerRef.current.contains(target)
      ) {
        setTimerOpen(false);
      }

      if (
        layoutRef.current &&
        !layoutRef.current.contains(target)
      ) {
        setLayoutOpen(false);
      }

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
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

  // ==========================================================
  // MOBILE BODY SCROLL
  // ==========================================================

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const original =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        original;
    };
  }, [mobileMenuOpen]);

  // ==========================================================
  // ESC
  // ==========================================================

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key !== "Escape") {
        return;
      }

      setTimerOpen(false);
      setLayoutOpen(false);
      setMobileMenuOpen(false);
      setUserMenuOpen(false);
    }

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ==========================================================
  // BUSY
  // ==========================================================

  const busy =
    Boolean(isRunning) ||
    Boolean(isSubmitting);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <header
      className="
        relative
        flex
        h-14
        w-full
        shrink-0
        items-center
        justify-between
        gap-1
        border-b
        border-neutral-200
        bg-white
        px-1.5
        dark:border-neutral-800
        dark:bg-[#0f172a]
        sm:px-3
      "
    >
      {/* ======================================================
          LEFT
      ====================================================== */}

      <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
        <Link
          href="/problems"
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-md
            text-neutral-500
            transition-colors
            hover:bg-neutral-100
            hover:text-neutral-900
            dark:hover:bg-neutral-800
            dark:hover:text-neutral-100
          "
          aria-label="Masalalar"
        >
          <SquareArrowLeft className="size-[18px]" />
        </Link>

        <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />

        <IconButton
          label="Masalalar ro'yxati"
          onClick={() =>
            setProblemsListOpen(true)
          }
        >
          <List className="size-[18px]" />
        </IconButton>

        <div className="hidden items-center sm:flex">
          <IconButton
            label="Oldingi masala"
            onClick={onPrev}
            disabled={
              Boolean(isNavigating) ||
              !hasPrev
            }
          >
            <ChevronLeft className="size-[18px]" />
          </IconButton>

          <IconButton
            label="Keyingi masala"
            onClick={onNext}
            disabled={
              Boolean(isNavigating) ||
              !hasNext
            }
          >
            <ChevronRight className="size-[18px]" />
          </IconButton>
        </div>

        <IconButton
          label="Tasodifiy masala"
          onClick={onRandom}
          disabled={Boolean(isNavigating)}
          className="hidden sm:flex"
        >
          {isNavigating ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <Shuffle className="size-[18px]" />
          )}
        </IconButton>
      </div>

      {/* ======================================================
          CENTER
      ====================================================== */}

      <div
        className="
          absolute
          left-1/2
          top-1/2
          flex
          -translate-x-1/2
          -translate-y-1/2
          items-center
          gap-1.5
          sm:gap-2
        "
      >
        {/* Run */}
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="
            flex
            h-8
            items-center
            gap-1.5
            rounded-md
            border
            border-neutral-200
            bg-neutral-50
            px-2.5
            text-sm
            font-medium
            text-neutral-700
            transition-colors
            hover:bg-neutral-100
            active:bg-neutral-200
            disabled:cursor-not-allowed
            disabled:opacity-60
            dark:border-neutral-700
            dark:bg-neutral-800
            dark:text-neutral-200
            dark:hover:bg-neutral-700
            sm:px-3
          "
        >
          {isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}

          <span className="hidden sm:inline">
            Yuritish
          </span>
        </button>

        {/* Submit */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy}
          className="
            flex
            h-8
            items-center
            gap-1.5
            rounded-md
            bg-green-600
            px-2.5
            text-sm
            font-medium
            text-white
            shadow-sm
            transition-colors
            hover:bg-green-700
            active:bg-green-800
            disabled:cursor-not-allowed
            disabled:opacity-60
            sm:px-3
          "
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CloudUpload className="size-4" />
          )}

          <span className="hidden sm:inline">
            Yuborish
          </span>
        </button>
      </div>

      {/* ======================================================
          RIGHT
      ====================================================== */}

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        {/* ====================================================
            TIMER
        ==================================================== */}

        <div
          className="relative hidden md:block"
          ref={timerRef}
        >
          <IconButton
            label={
              timerState.running
                ? `Timer: ${formatClock(
                    timerState.seconds
                  )}`
                : "Vaqt hisoblagich"
            }
            active={timerOpen}
            onClick={() => {
              setTimerOpen(
                (value) => !value
              );

              setLayoutOpen(false);
              setUserMenuOpen(false);
            }}
          >
            <Timer className="size-[18px]" />

            {timerState.running && (
              <span
                className="
                  absolute
                  right-1
                  top-1
                  size-1.5
                  rounded-full
                  bg-red-500
                  ring-2
                  ring-white
                  dark:ring-[#0f172a]
                "
              />
            )}
          </IconButton>

          {timerOpen && (
            <div
              className="
                absolute
                right-0
                top-10
                z-50
                w-80
                rounded-xl
                border
                border-neutral-200
                bg-white
                p-3
                shadow-xl
                dark:border-neutral-700
                dark:bg-neutral-900
              "
            >
              <TimerSection
                state={timerState}
                onChange={setTimerState}
                onAction={onAction}
              />
            </div>
          )}
        </div>

        {/* ====================================================
            LAYOUT
        ==================================================== */}

        <div
          className="relative hidden md:block"
          ref={layoutRef}
        >
          <IconButton
            label="Joylashuv sozlamalari"
            active={layoutOpen}
            onClick={() => {
              setLayoutOpen(
                (value) => !value
              );

              setTimerOpen(false);
              setUserMenuOpen(false);
            }}
          >
            <Settings className="size-[18px]" />
          </IconButton>

          {layoutOpen && (
            <div
              className="
                absolute
                right-0
                top-10
                z-50
                w-80
                rounded-xl
                border
                border-neutral-200
                bg-white
                p-3
                shadow-xl
                dark:border-neutral-700
                dark:bg-neutral-900
              "
            >
              <p
                className="
                  mb-2
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-wide
                  text-neutral-400
                "
              >
                Joylashuv
              </p>

              <LayoutSection
                value={layout}
                onChange={(value) => {
                  onLayoutChange?.(
                    value
                  );

                  setLayoutOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* ====================================================
            AI
        ==================================================== */}

        <div className="hidden items-center gap-0.5 lg:flex">
          <IconButton
            label="AI yordamchi"
            onClick={() =>
              onAction?.(
                "AI yordamchi hali ishlab chiqilmoqda (UI namoyishi)"
              )
            }
          >
            <Sparkles className="size-[18px]" />
          </IconButton>
        </div>

        {/* ====================================================
            MOBILE MENU
        ==================================================== */}

        <IconButton
          label="Menyu"
          active={mobileMenuOpen}
          className="md:hidden"
          onClick={() =>
            setMobileMenuOpen(true)
          }
        >
          <Menu className="size-[18px]" />
        </IconButton>

        <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />

        {/* ====================================================
            STREAK
        ==================================================== */}

        <div
          className="
            hidden
            h-8
            items-center
            gap-1
            rounded-md
            px-2
            text-sm
            text-neutral-500
            sm:flex
          "
          title="Kunlik seriya"
        >
          <Flame className="size-4 text-orange-400" />

          <span className="tabular-nums">
            {streakCount}
          </span>
        </div>

        <div className="mx-0.5 hidden h-5 w-px bg-neutral-200 dark:bg-neutral-700 sm:block" />

        {/* ====================================================
            USER PROFILE
        ==================================================== */}

        {isAuthenticated && user ? (
          <div
            ref={userMenuRef}
            className="relative"
          >
            {/* USER BUTTON */}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(
                  (value) => !value
                );

                setTimerOpen(false);
                setLayoutOpen(false);
              }}
              className="
                flex
                h-8
                items-center
                gap-1.5
                rounded-md
                px-1
                text-sm
                text-neutral-600
                transition-colors
                hover:bg-neutral-100
                dark:text-neutral-300
                dark:hover:bg-neutral-800
              "
              aria-label="Foydalanuvchi ma'lumotlari"
              aria-expanded={userMenuOpen}
            >
              <span
                className="
                  flex
                  size-6
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-orange-100
                  text-[11px]
                  font-semibold
                  text-orange-600
                  dark:bg-orange-950
                  dark:text-orange-400
                "
              >
                {user.username
                  ?.slice(0, 1)
                  .toUpperCase() ?? "?"}
              </span>

              <span
                className="
                  hidden
                  max-w-[80px]
                  truncate
                  font-medium
                  md:inline
                  lg:max-w-[120px]
                "
              >
                {user.username}
              </span>
            </button>

            {/* USER PROFILE POPOVER */}
            {userMenuOpen && (
              <UserProfilePopover
                user={user}
                isPremium={isPremium}
                onClose={() => setUserMenuOpen(false)}
              />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAccessibilityOpen(true)}
              title="Maxsus imkoniyatlar"
              aria-label="Maxsus imkoniyatlar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <SlidersHorizontal className="size-4" />
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              title={darkMode ? "Yorug' rejim" : "Tungi rejim"}
              aria-label="Rejimni almashtirish"
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              {darkMode ? <Sun className="size-4 text-amber-500" /> : <Moon className="size-4 text-neutral-500" />}
            </button>

            <Link
              href="/login"
              className="
                flex
                h-8
                items-center
                rounded-md
                px-2
                text-sm
                font-medium
                text-neutral-500
                transition-colors
                hover:bg-neutral-100
                hover:text-neutral-900
                dark:hover:bg-neutral-800
                dark:hover:text-neutral-100
              "
            >
              Kirish
            </Link>
          </div>
        )}

        {/* ====================================================
            PREMIUM
        ==================================================== */}

        {isPremium === true ? (
          <div
            className="
              ml-0.5
              flex
              h-8
              items-center
              gap-1
              rounded-md
              bg-emerald-50
              px-1.5
              text-sm
              font-medium
              text-emerald-700
              dark:bg-emerald-950/50
              dark:text-emerald-400
              sm:px-2.5
            "
            title="Premium obuna faol"
          >
            <CheckCircle2 className="size-[15px]" />

            <span className="hidden sm:inline">
              Premium faol
            </span>
          </div>
        ) : (
          <Link
            href="/subscribe"
            className="
              ml-0.5
              flex
              h-8
              items-center
              gap-1
              rounded-md
              bg-amber-100
              px-1.5
              text-sm
              font-medium
              text-amber-700
              transition-colors
              hover:bg-amber-200
              dark:bg-amber-950/50
              dark:text-amber-400
              sm:gap-1.5
              sm:px-3
            "
          >
            <Crown className="size-[15px]" />

            <span className="hidden sm:inline">
              Premium
            </span>
          </Link>
        )}
      </div>

      {/* ======================================================
          MOBILE MENU
      ====================================================== */}

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <button
            type="button"
            aria-label="Yopish"
            className="
              absolute
              inset-0
              bg-black/40
              backdrop-blur-[2px]
            "
            onClick={() =>
              setMobileMenuOpen(false)
            }
          />

          {/* Sheet */}
          <div
            className="
              absolute
              inset-x-0
              bottom-0
              max-h-[88dvh]
              overflow-y-auto
              rounded-t-2xl
              bg-white
              p-4
              pb-[max(1rem,env(safe-area-inset-bottom))]
              shadow-2xl
              dark:bg-neutral-900
            "
          >
            {/* Drag handle */}
            <div
              className="
                mx-auto
                mb-3
                h-1
                w-10
                rounded-full
                bg-neutral-200
                dark:bg-neutral-700
              "
            />

            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Menyu
              </h2>

              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                aria-label="Yopish"
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-md
                  text-neutral-400
                  hover:bg-neutral-100
                  dark:hover:bg-neutral-800
                "
              >
                <X className="size-5" />
              </button>
            </div>

            {/* LAYOUT */}
            <p
              className="
                mb-2
                text-[11px]
                font-semibold
                uppercase
                tracking-wide
                text-neutral-400
              "
            >
              Joylashuv
            </p>

            <LayoutSection
              value={layout}
              onChange={(value) =>
                onLayoutChange?.(value)
              }
            />

            {/* TIMER */}
            <p
              className="
                mb-2
                mt-4
                text-[11px]
                font-semibold
                uppercase
                tracking-wide
                text-neutral-400
              "
            >
              Vaqt
            </p>

            <TimerSection
              state={timerState}
              onChange={setTimerState}
              onAction={onAction}
            />

            {/* TOOLS */}
            <p
              className="
                mb-2
                mt-4
                text-[11px]
                font-semibold
                uppercase
                tracking-wide
                text-neutral-400
              "
            >
              Vositalar
            </p>

            <div
              className="
                divide-y
                divide-neutral-100
                rounded-xl
                border
                border-neutral-200
                dark:divide-neutral-800
                dark:border-neutral-700
              "
            >
              <MobileMenuItem
                icon={
                  <NotebookPen className="size-[18px]" />
                }
                label="Qaydlar"
                onClick={() => {
                  onAction?.(
                    "Qaydlar paneli hali ishlab chiqilmoqda (UI namoyishi)"
                  );

                  setMobileMenuOpen(false);
                }}
              />

              <MobileMenuItem
                icon={
                  <Sparkles className="size-[18px]" />
                }
                label="AI yordamchi"
                onClick={() => {
                  onAction?.(
                    "AI yordamchi hali ishlab chiqilmoqda (UI namoyishi)"
                  );

                  setMobileMenuOpen(false);
                }}
              />

              <MobileMenuItem
                icon={
                  <Shuffle className="size-[18px]" />
                }
                label="Tasodifiy masala"
                onClick={() => {
                  onRandom?.();

                  setMobileMenuOpen(false);
                }}
              />

              <MobileMenuItem
                icon={
                  <Users className="size-[18px]" />
                }
                label="Boshqalar bilan ulanish"
                onClick={() => {
                  onAction?.(
                    "Hamkorlikda yechish hali ishlab chiqilmoqda (UI namoyishi)"
                  );

                  setMobileMenuOpen(false);
                }}
              />

              <MobileMenuItem
                icon={
                  <Settings className="size-[18px]" />
                }
                label="Sozlamalar"
                onClick={() => {
                  onAction?.(
                    "Umumiy sozlamalar hali ishlab chiqilmoqda (UI namoyishi)"
                  );

                  setMobileMenuOpen(false);
                }}
              />
            </div>

            {/* STREAK */}
            <div
              className="
                mt-4
                flex
                items-center
                justify-between
                rounded-xl
                border
                border-neutral-200
                p-3
                dark:border-neutral-700
              "
            >
              <span
                className="
                  flex
                  items-center
                  gap-1.5
                  text-sm
                  text-neutral-600
                  dark:text-neutral-300
                "
              >
                <Flame className="size-4 text-orange-400" />

                Kunlik seriya
              </span>

              <span
                className="
                  text-sm
                  font-bold
                  tabular-nums
                  text-neutral-900
                  dark:text-neutral-100
                "
              >
                {streakCount} kun
              </span>
            </div>

            {/* TIL VA MAXSUS IMKONIYATLAR (MOBIL) */}
            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Globe className="size-3.5" />
                  <span>Change language</span>
                </span>
                <span className="font-mono text-[10px] font-bold text-orange-600 dark:text-orange-400">
                  {language}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(["UZ", "RU", "EN", "QQ"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      "rounded-lg py-2 text-center font-mono text-xs font-bold transition-all",
                      language === lang
                        ? "bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-black"
                        : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {darkMode ? (
                    <Sun className="size-4 text-amber-500" />
                  ) : (
                    <Moon className="size-4 text-neutral-500" />
                  )}
                  <span>{darkMode ? "Yorug' rejim" : "Tungi rejim"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAccessibilityOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  <SlidersHorizontal className="size-4 text-neutral-500" />
                  <span>Maxsus</span>
                </button>
              </div>
            </div>

            {/* PROFIL & CHIQISH (MOBIL) */}
            {isAuthenticated && user && (
              <div className="mt-3 space-y-1">
                <Link
                  href={`/user/${user.username || ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                >
                  <UserIcon className="size-4 text-neutral-500" />
                  <span>Profilim</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-red-200/60 bg-red-50/50 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                >
                  <LogOut className="size-4" />
                  <span>Chiqish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================
          PROBLEMS LIST
      ====================================================== */}

      <ProblemsListSheet
        open={problemsListOpen}
        onClose={() =>
          setProblemsListOpen(false)
        }
        currentSlug={slug}
      />
    </header>
  );
}

// ============================================================
// MOBILE MENU ITEM
// ============================================================

function MobileMenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        flex
        w-full
        items-center
        gap-3
        px-3.5
        py-3
        text-left
        text-sm
        font-medium
        text-neutral-700
        transition-colors
        hover:bg-neutral-50
        active:bg-neutral-100
        dark:text-neutral-200
        dark:hover:bg-neutral-800
      "
    >
      <span className="text-neutral-400">
        {icon}
      </span>

      {label}
    </button>
  );
}
