"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Difficulty, ProblemsResponse } from "@/lib/problems/types";
import { getProblemsList } from "@/lib/problems/api";

interface ProblemsListSheetProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  currentSlug?: string;
}

const PAGE_SIZE = 20;

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const DIFFICULTY_CLASSES: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  medium: "bg-amber-50 text-amber-600 border border-amber-200",
  hard: "bg-rose-50 text-rose-600 border border-rose-200",
};

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function ProblemsListSheet({
  open,
  isOpen,
  onClose,
  currentSlug,
}: ProblemsListSheetProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query.trim(), 300);

  const isSheetOpen = Boolean(open ?? isOpen);

  // ============================================================
  // SWR INFINITE SETUP
  // ============================================================

  const getKey = (
    pageIndex: number,
    previousPageData: ProblemsResponse | null
  ): [string, string, number] | null => {
    // Sheet o'chirilsa key generatsiya qilma
    if (!isSheetOpen) return null;

    // Oldingi sahifa bo'sh bo'lsa (hech narsa topilmadi) keyingi sahifalarni yuklama
    if (
      previousPageData &&
      (!previousPageData.data || previousPageData.data.length === 0)
    ) {
      return null;
    }

    const offset = pageIndex * PAGE_SIZE;
    return ["problems-sheet", debouncedQuery, offset] as const;
  };

  const { data, error, size, setSize, isValidating, mutate } =
    useSWRInfinite<ProblemsResponse>(
      getKey,
      async ([, searchKey, offsetKey]) =>
        getProblemsList({
          limit: PAGE_SIZE,
          offset: Number(offsetKey),
          search: String(searchKey),
        }),
      {
        revalidateOnFocus: false,
        revalidateFirstPage: false,
        keepPreviousData: true,
        dedupingInterval: 10000,
      }
    );

  // ============================================================
  // STATE CALCULATIONS
  // ============================================================

  const allProblems = data ? data.flatMap((page) => page?.data ?? []) : [];

  const isLoadingInitialData = !data && !error;
  const isLoadingMore =
    isLoadingInitialData ||
    (size > 0 && data && typeof data[size - 1] === "undefined");

  const isEmpty = data?.[0]?.data?.length === 0;
  const totalCount = data?.[0]?.count ?? 0;

  const isReachingEnd =
    isEmpty ||
    (data && (data[data.length - 1]?.data?.length ?? 0) < PAGE_SIZE) ||
    allProblems.length >= totalCount;

  // ============================================================
  // EFFECTS
  // ============================================================

  // ESC tugmasi orqali yopish
  useEffect(() => {
    if (!isSheetOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSheetOpen, onClose]);

  // Body scroll'ni blokirovka qilish
  useEffect(() => {
    if (!isSheetOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isSheetOpen]);

  // Qidiruv o'zgarganda birinchi sahifadan boshlash
  useEffect(() => {
    if (!isSheetOpen) return;
    setSize(1);
  }, [debouncedQuery, isSheetOpen, setSize]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const onScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element || isLoadingMore || isReachingEnd || isValidating) return;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    // 150px dan kam qolganda keyingi sahifani yuklash
    if (distanceFromBottom < 150) {
      setSize((prev) => prev + 1);
    }
  }, [isLoadingMore, isReachingEnd, isValidating, setSize]);

  const handleProblemClick = useCallback(
    (slug?: string) => {
      if (slug && slug !== currentSlug) {
        onClose();
        router.push(`/problem/${slug}`);
      }
    },
    [currentSlug, onClose, router]
  );

  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  const handleClearSearch = useCallback(() => {
    setQuery("");
  }, []);

  if (!isSheetOpen) return null;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Yopish"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
      />

      {/* Sheet Panel */}
      <div className="relative flex h-full w-full flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200 sm:w-[480px] lg:w-1/2 lg:max-w-xl">
        {/* ====== HEADER ====== */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:pt-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              Masalalar ro&apos;yxati
            </h2>
            {totalCount > 0 && (
              <span className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-sm">
                {totalCount} ta
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Yopish"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* ====== SEARCH BAR ====== */}
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masala nomini qidiring..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              autoFocus
              aria-label="Qidiruv"
            />
            {query && (
              <button
                type="button"
                aria-label="Qidiruv so'zini tozalash"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* ====== CONTENT BODY ====== */}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex-1 overflow-y-auto bg-white pb-[env(safe-area-inset-bottom)]"
        >
          {/* XATOLIK HOLATI */}
          {error && allProblems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-8 text-center">
              <div className="rounded-full bg-red-50 p-4">
                <AlertTriangle className="size-8 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Ro&apos;yxatni yuklashda xatolik
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {error?.message || "Internet aloqasini tekshiring"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 active:scale-95"
              >
                <RotateCcw className="size-4" />
                Qayta urinish
              </button>
            </div>
          ) : /* LOADING HOLATI */
          isLoadingInitialData ? (
            <div className="flex h-full items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-orange-500" />
                <p className="text-xs text-slate-500">Masalalar yuklanyapti...</p>
              </div>
            </div>
          ) : /* BO'SH HOLATI */
          isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
              <div className="rounded-full bg-amber-50 p-4">
                <Search className="size-8 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {debouncedQuery ? "Hech narsa topilmadi" : "Masalalar topilmadi"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {debouncedQuery
                    ? `"${debouncedQuery}" uchun masalalar yo'q`
                    : "Bazada masalalar mavjud emas"}
                </p>
              </div>
            </div>
          ) : (
            /* MASALALAR RO'YXATI */
            <ul className="divide-y divide-slate-100">
              {allProblems.map((problem, index) => {
                const problemId = problem.id ?? index + 1;
                const title = problem.title ?? `Masala #${problemId}`;
                const slug = problem.slug ?? "";
                const difficulty: Difficulty | string = problem.difficulty ?? "";
                const category = problem.category ?? null;
                const isSolved = problem.solved ?? false;
                const isPremium = problem.premium ?? false;
                const hasAccess = problem.hasAccess ?? true;
                const xp = problem.xp ?? 0;
                const acceptance = problem.acceptance ?? 0;

                const isActive = slug === currentSlug;
                const isLocked = isPremium && !hasAccess;

                return (
                  <li key={`${problemId}-${slug || index}`}>
                    <button
                      type="button"
                      onClick={() => handleProblemClick(slug)}
                      disabled={!slug || isLocked}
                      className={cn(
                        "flex w-full items-center gap-3 px-5 py-4 text-left transition-all duration-150",
                        isActive
                          ? "bg-gradient-to-r from-orange-50 to-orange-50/50 hover:bg-orange-50"
                          : "hover:bg-slate-50",
                        isLocked &&
                          "cursor-not-allowed opacity-75 hover:bg-white"
                      )}
                    >
                      {/* ===== STATUS ICON ===== */}
                      <span className="flex size-5 shrink-0 items-center justify-center">
                        {isSolved ? (
                          <CheckCircle2 className="size-5 text-emerald-500 animate-pulse" />
                        ) : isLocked ? (
                          <Lock className="size-4 text-amber-500" />
                        ) : (
                          <span className="size-2.5 rounded-full bg-slate-300" />
                        )}
                      </span>

                      {/* ===== MAIN CONTENT ===== */}
                      <span className="min-w-0 flex-1">
                        {/* Masala nomi va badge'lar */}
                        <span
                          className={cn(
                            "flex flex-wrap items-center gap-2 font-semibold leading-snug",
                            isActive ? "text-orange-700" : "text-slate-900"
                          )}
                        >
                          <span className="truncate text-sm">
                            {problemId}. {title}
                          </span>

                          {/* Premium badge */}
                          {isPremium && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <Sparkles className="size-2.5" />
                              PRO
                            </span>
                          )}

                          {/* Lock icon agar premium va access yo'q */}
                          {isLocked && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                              Yopiq
                            </span>
                          )}
                        </span>

                        {/* Meta ma'lumotlar */}
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {/* Kategoriya */}
                          {category && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {category}
                            </span>
                          )}

                          {/* XP va Acceptance */}
                          <div className="flex items-center gap-2 text-[11px]">
                            {xp > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                ⭐ {xp} XP
                              </span>
                            )}

                            {acceptance > 0 && (
                              <>
                                {xp > 0 && (
                                  <span className="text-slate-400">•</span>
                                )}
                                <span className="text-slate-500">
                                  {acceptance.toFixed(1)}%
                                </span>
                              </>
                            )}
                          </div>
                        </span>
                      </span>

                      {/* ===== DIFFICULTY BADGE ===== */}
                      {difficulty && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                            difficulty === "easy"
                              ? "bg-emerald-100 text-emerald-700"
                              : difficulty === "medium"
                              ? "bg-amber-100 text-amber-700"
                              : difficulty === "hard"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {DIFFICULTY_LABELS[String(difficulty)] ??
                            String(difficulty)}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}

              {/* ===== LOADING MORE INDICATOR ===== */}
              {isValidating && size > 1 && (
                <li className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-orange-500" />
                    <span className="text-xs text-slate-500">
                      Ko'proq masalalar yuklanyapti...
                    </span>
                  </div>
                </li>
              )}

              {/* ===== END OF LIST ===== */}
              {isReachingEnd && allProblems.length > 0 && (
                <li className="py-6 text-center">
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Barcha masalalar yuklandi ({allProblems.length} ta)</span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export const ProblemListSheet = ProblemsListSheet;
