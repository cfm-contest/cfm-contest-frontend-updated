"use client";

import { backendRequest } from "@/lib/api/django/backend";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Lock,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  BookOpen,
  Compass,
  Calendar as CalendarIcon,
  X,
  Sparkles,
  Filter,
  CheckCircle2,
  CalendarDays,
  RotateCcw,
  Trophy,
  Tag as TagIcon,
  Bookmark as BookmarkIcon,
  SlidersHorizontal,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext"; // yo'lni loyihangizga moslang
import { getRandomProblem } from "@/lib/problems/api";
import { DIFFICULTY_LABELS } from "@/lib/problems/utils";
import type {
  ProblemsResponse,
  Category,
  Tag,
  ProblemStats,
  Difficulty,
  Problems,
} from "@/lib/problems/types";

interface ProblemsListClientProps {
  initialProblems: ProblemsResponse;
  categories: Category[];
  tags: Tag[];
  initialStats: ProblemStats;
  currentPage: number;
}

interface BookmarkItem {
  id: number;
  slug: string;
  title: string;
  created_at: string;
}

// O'zbekcha murakkablik darajasi nomlari
const UZ_DIFFICULTY: Record<string, string> = {
  easy: "Oson",
  medium: "O'rta",
  hard: "Qiyin",
};

const monthNamesUz = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

const SKELETON_ROWS = 8;

export default function ProblemsListClient({
  initialProblems,
  categories,
  tags,
  initialStats,
  currentPage,
}: ProblemsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Premium Modal steyti
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filtrlash steytlari
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [selectedTag, setSelectedTag] = useState(() => searchParams.get("tag_id") || "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(
    () => (searchParams.get("difficulty") as Difficulty) || ""
  );
  const [category, setCategory] = useState(() => searchParams.get("category_id") || "");

  // Kalendar sana oraliqlari
  const [fromDate, setFromDate] = useState(
    () => searchParams.get("from_date") || searchParams.get("from") || ""
  );
  const [toDate, setToDate] = useState(
    () => searchParams.get("to_date") || searchParams.get("to") || ""
  );

  const [randomLoading, setRandomLoading] = useState(false);

  // Kalendarda ko'rsatilayotgan joriy oy va yil
  const [currentCalendarDate, setCurrentCalendarDate] = useState(() => {
    const fromParam = searchParams.get("from_date") || searchParams.get("from");
    return fromParam ? new Date(fromParam) : new Date();
  });

  // Oylik masalalar statistikasi
  const [publishCountMap, setPublishCountMap] = useState<Record<string, number>>({});
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);

  // Bookmarklar
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);

  // URL ni yangilash va Router navigatsiyasi
  const updateFilters = useCallback(
    (newParams: Record<string, string | null>, resetOthers = false) => {
      let params = new URLSearchParams();

      if (!resetOthers) {
        params = new URLSearchParams(searchParams.toString());
      }

      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== null && value !== "") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.delete("from");
      params.delete("to");

      if (!("page" in newParams)) {
        params.set("page", "1");
      }

      startTransition(() => {
        router.push(`/problems?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Bookmarklarni olish — faqat login qilgan foydalanuvchi uchun
  useEffect(() => {
    // Auth holati hali aniqlanmagan — kutamiz
    if (isAuthLoading) return;

    // Login qilmagan — so'rov umuman yuborilmaydi
    if (!isAuthenticated) {
      setBookmarks([]);
      setBookmarksLoading(false);
      return;
    }

    const controller = new AbortController();
    setBookmarksLoading(true);

    (async () => {
      try {
        const res = await backendRequest("/api/problems/bookmarks", {
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Bookmarklarni yuklashda xatolik");

        const data: BookmarkItem[] = await res.json();
        setBookmarks(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setBookmarks([]);
      } finally {
        if (!controller.signal.aborted) setBookmarksLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isAuthenticated, isAuthLoading]);

  // Kalendar statistikasini backend'dan olish
  useEffect(() => {
    let cancelled = false;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth() + 1;

    async function loadCalendarStats() {
      setIsCalendarLoading(true);
      try {
        const response = await backendRequest(
          `/api/problems/calendar-stats/?year=${year}&month=${month}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Kalendar statistikasini yuklashda xatolik");
        }

        const data: Record<string, number> = await response.json();

        if (!cancelled) setPublishCountMap(data);
      } catch {
        if (!cancelled) setPublishCountMap({});
      } finally {
        if (!cancelled) setIsCalendarLoading(false);
      }
    }

    loadCalendarStats();

    return () => {
      cancelled = true;
    };
  }, [currentCalendarDate]);

  // Kalendarda kun bosilganda oraliq bo'yicha filtr shakllantirish
  const handleCalendarDayClick = (dateStr: string) => {
    if ((!fromDate && !toDate) || (fromDate && toDate)) {
      setFromDate(dateStr);
      setToDate("");
      setSearch("");
      setSelectedTag("");
      setDifficulty("");
      setCategory("");

      updateFilters(
        {
          from_date: dateStr,
          to_date: null,
          search: null,
          tag_id: null,
          category_id: null,
          difficulty: null,
        },
        true
      );
      return;
    }

    if (fromDate && !toDate) {
      let start = fromDate;
      let end = dateStr;

      if (new Date(dateStr) < new Date(fromDate)) {
        start = dateStr;
        end = fromDate;
      }

      setFromDate(start);
      setToDate(end);

      updateFilters(
        {
          from_date: start,
          to_date: end,
          search: null,
          tag_id: null,
          category_id: null,
          difficulty: null,
        },
        true
      );
    }
  };

  const clearDateRange = () => {
    setFromDate("");
    setToDate("");
    updateFilters({ from_date: null, to_date: null });
  };

  const handleStandardFilterChange = (filterUpdate: Record<string, string | null>) => {
    if (fromDate || toDate) {
      setFromDate("");
      setToDate("");
      filterUpdate.from_date = null;
      filterUpdate.to_date = null;
    }
    updateFilters(filterUpdate);
  };

  // Teg tanlash/bekor qilish
  const toggleTagSelect = (tagId: string) => {
    const active = selectedTag === tagId;
    const nextVal = active ? null : tagId;
    setSelectedTag(nextVal || "");
    handleStandardFilterChange({ tag_id: nextVal });
  };

  // Masalaga bosilganda Premium va Access tekshiruvi
  const handleProblemClick = (e: React.MouseEvent, problem: Problems) => {
    if (problem.premium && !problem.hasAccess) {
      e.preventDefault();
      setIsPremiumModalOpen(true);
    }
  };

  // Qidiruv (debounce)
  useEffect(() => {
    const currentSearchInUrl = searchParams.get("search") || "";
    if (search.trim() === currentSearchInUrl) return;

    const timer = setTimeout(() => {
      handleStandardFilterChange({ search: search.trim() || null });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // URL parametrlari o'zgarganda steytlarni sinxronlash
  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setSelectedTag(searchParams.get("tag_id") || "");
    setDifficulty((searchParams.get("difficulty") as Difficulty) || "");
    setCategory(searchParams.get("category_id") || "");
    setFromDate(searchParams.get("from_date") || searchParams.get("from") || "");
    setToDate(searchParams.get("to_date") || searchParams.get("to") || "");
  }, [searchParams]);

  // Tasodifiy masala tanlash
  const handleRandomProblem = async () => {
    try {
      setRandomLoading(true);
      const res = await getRandomProblem();
      if (res?.slug) {
        router.push(`/problem/${res.slug}`);
        return;
      }
    } catch {
      if (initialProblems.data.length > 0) {
        const randomIndex = Math.floor(Math.random() * initialProblems.data.length);
        const randomProblem = initialProblems.data[randomIndex];
        router.push(`/problem/${randomProblem.slug}`);
        return;
      }
      alert("Hozircha masalalar topilmadi.");
    } finally {
      setRandomLoading(false);
    }
  };

  // Kalendar setkasi
  const calendarGrid = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: ({ dayNumber: number; dateStr: string; count: number } | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, "0");
      const formattedDay = String(d).padStart(2, "0");
      const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

      days.push({
        dayNumber: d,
        dateStr,
        count: publishCountMap[dateStr] || 0,
      });
    }
    return days;
  }, [currentCalendarDate, publishCountMap]);

  const totalPages = Math.max(1, Math.ceil(initialProblems.count / initialProblems.limit));

  const showBookmarkSkeleton = isAuthLoading || (isAuthenticated && bookmarksLoading);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">

        {/* HERO BANNER: FAANG & TEXNIK INTERVYULAR */}
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-black text-white shadow-2xl shadow-black/20 p-6 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 z-10 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-96"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 opacity-[0.05] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]"
          />
          <div className="relative z-20 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-amber-400 backdrop-blur">
                  <Sparkles className="size-3.5 fill-current" /> FAANG & Top IT Intervyu
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-zinc-300 backdrop-blur">
                  Lightning Judge avtotest
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Algoritmik Masalalar va FAANG Intervyu Savollari
              </h1>
              <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
                Google, Meta, Amazon, Apple va yetakchi IT kompaniyalarning texnik suhbatlarida tushadigan algoritmlar to‘plami. Real kod muharriri orqali amaliyot qiling, yechimlaringizni sinang va mahoratingizni oshiring.
              </p>
            </div>

            {/* Quick stats & Random problem CTA */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 backdrop-blur">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Yechilgan / Jami</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums text-white">
                    {initialStats.solved} <span className="text-xs font-normal text-zinc-500">/ {initialStats.total}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRandomProblem}
                disabled={randomLoading}
                className="inline-flex h-11 sm:h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-xs sm:text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-[0.98] shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Shuffle className="size-4" />
                {randomLoading ? "Tanlanmoqda..." : "Tasodifiy masala"}
              </button>
            </div>
          </div>
        </section>

        {/* ASOSIY LAYOUT: SIDEBARLAR VA RO'YXAT */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* CHAP SIDEBAR (Desktop) */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="space-y-6 text-sm">
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-4 shadow-sm">
                <p className="mb-3 px-2 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Bo‘limlar
                </p>
                <nav className="space-y-1">
                  <Link
                    href="/problems"
                    className="flex items-center gap-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black px-3 py-2.5 font-medium shadow-sm transition"
                  >
                    <BookOpen className="h-4 w-4" />
                    Masalalar to‘plami
                  </Link>
                  <Link
                    href="/courses"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <Compass className="h-4 w-4" />
                    Onlayn kurslar
                  </Link>
                  <Link
                    href="/contests"
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white transition"
                  >
                    <Trophy className="h-4 w-4" />
                    Musobaqalar
                  </Link>
                </nav>
              </div>

              {/* BOOKMARKLAR */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-4 shadow-sm">
                <p className="mb-2 flex items-center justify-between px-2 text-[11px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  <span>Saqlanganlar</span>
                  {isAuthenticated && !showBookmarkSkeleton && bookmarks.length > 0 && (
                    <span className="rounded-full bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-zinc-300">
                      {bookmarks.length}
                    </span>
                  )}
                </p>

                {showBookmarkSkeleton ? (
                  <div className="space-y-2 px-2 pt-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
                        <Skeleton className="h-3.5 w-full" />
                      </div>
                    ))}
                  </div>
                ) : !isAuthenticated ? (
                  <p className="px-2 pt-2 text-xs leading-relaxed text-slate-400 dark:text-zinc-500">
                    Masalalarni saqlash uchun{" "}
                    <Link href="/login?next=/problems" className="font-semibold text-slate-900 dark:text-white underline">
                      tizimga kiring
                    </Link>
                    .
                  </p>
                ) : bookmarks.length === 0 ? (
                  <p className="px-2 pt-2 text-xs text-slate-400 dark:text-zinc-500">Hozircha saqlangan masalalar yo‘q.</p>
                ) : (
                  <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1 pt-1">
                    {bookmarks.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/problem/${b.slug}`}
                          title={b.title}
                          className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-zinc-400 transition hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white"
                        >
                          <BookmarkIcon className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                          <span className="truncate">
                            {b.id}. {b.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          {/* ASOSIY RO'YXAT VA FILTRLAR */}
          <main className="flex-1 min-w-0 space-y-4">

            {/* QIDIRUV VA TEZKOR FILTRLAR */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-3 sm:p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Masala yoki algoritm nomi bo‘yicha qidirish..."
                    className="h-11 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-800/60 pl-10 pr-9 text-xs sm:text-sm text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 outline-none transition focus:border-slate-900 dark:focus:border-white/40 focus:bg-white dark:focus:bg-zinc-900"
                  />
                  {search && (
                    <button
                      type="button"
                      aria-label="Qidiruvni tozalash"
                      onClick={() => {
                        setSearch("");
                        handleStandardFilterChange({ search: null });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={difficulty}
                  onChange={(e) => {
                    const val = e.target.value as Difficulty | "";
                    setDifficulty(val);
                    handleStandardFilterChange({ difficulty: val || null });
                  }}
                  aria-label="Murakkablik bo‘yicha filtr"
                  className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-slate-900 dark:focus:border-white/40 cursor-pointer"
                >
                  <option value="">Barcha darajalar</option>
                  <option value="easy">Oson</option>
                  <option value="medium">O‘rta</option>
                  <option value="hard">Qiyin</option>
                </select>

                <select
                  value={category}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategory(val);
                    handleStandardFilterChange({ category_id: val || null });
                  }}
                  aria-label="Kategoriya bo‘yicha filtr"
                  className="h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm text-slate-700 dark:text-zinc-200 outline-none focus:border-slate-900 dark:focus:border-white/40 cursor-pointer max-w-[160px] truncate"
                >
                  <option value="">Kategoriyalar</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 xl:hidden cursor-pointer"
                >
                  <SlidersHorizontal className="size-4" />
                  Filtrlar
                </button>
              </div>

              {/* MOBIL FILTRLAR PANELI (Ochilganda) */}
              {mobileFiltersOpen && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-white/10 space-y-3 xl:hidden animate-in fade-in duration-200">
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                    Teglar bo‘yicha saralash
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTag("");
                        handleStandardFilterChange({ tag_id: null });
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                        !selectedTag
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black font-semibold"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                      }`}
                    >
                      Barchasi
                    </button>
                    {tags.map((tag) => {
                      const tagIdStr = String(tag.id);
                      const isActive = selectedTag === tagIdStr;
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleTagSelect(tagIdStr)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white dark:bg-white dark:text-black font-semibold"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* SANA FILTRI PANELI */}
            {(fromDate || toDate) && (
              <div className="flex items-center justify-between rounded-2xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300">
                <span className="flex items-center gap-2 font-medium">
                  <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Sana bo‘yicha filtr:{" "}
                  <strong>
                    {fromDate || "..."} {toDate ? `→ ${toDate}` : "(Yakuniy sanani tanlang)"}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={clearDateRange}
                  className="flex items-center gap-1 text-xs font-semibold underline cursor-pointer hover:opacity-80"
                >
                  Tozalash <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* JADVAL / MASALALAR RO'YXATI */}
            <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400 font-semibold">
                    <tr>
                      <th className="py-3.5 pl-4 pr-1 w-10 text-center">Holat</th>
                      <th className="px-4 py-3.5">Masala nomi</th>
                      <th className="px-4 py-3.5">Qabul foizi</th>
                      <th className="px-4 py-3.5">Darajasi</th>
                      <th className="px-4 py-3.5 hidden md:table-cell">Sana</th>
                      <th className="px-4 py-3.5 text-right pr-6">XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-zinc-300">
                    {isPending ? (
                      Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                        <tr key={`sk-${i}`}>
                          <td className="py-3.5 pl-4 pr-1">
                            <Skeleton className="mx-auto h-4 w-4 rounded-full" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-3/4" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-10" />
                          </td>
                          <td className="px-4 py-3.5">
                            <Skeleton className="h-4 w-12" />
                          </td>
                          <td className="px-4 py-3.5 hidden md:table-cell">
                            <Skeleton className="h-4 w-16" />
                          </td>
                          <td className="px-4 py-3.5 pr-6">
                            <Skeleton className="ml-auto h-4 w-8" />
                          </td>
                        </tr>
                      ))
                    ) : initialProblems.data.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-zinc-500">
                          Tanlangan mezonlarga mos algoritmik masalalar topilmadi.
                        </td>
                      </tr>
                    ) : (
                      initialProblems.data.map((problem) => {
                        const isEasy = problem.difficulty === "easy";
                        const isMedium = problem.difficulty === "medium";
                        const isLocked = problem.premium && !problem.hasAccess;

                        return (
                          <tr key={problem.id} className="group transition hover:bg-slate-50/80 dark:hover:bg-zinc-800/40">
                            <td className="py-3.5 pl-4 pr-1 text-center">
                              {problem.solved ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                              ) : isLocked ? (
                                <Lock className="mx-auto h-3.5 w-3.5 text-amber-500" />
                              ) : null}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/problem/${problem.slug}`}
                                  onClick={(e) => handleProblemClick(e, problem)}
                                  className={`font-semibold transition flex items-center gap-1.5 ${
                                    isLocked
                                      ? "text-slate-500 hover:text-amber-500 cursor-pointer"
                                      : "text-slate-900 dark:text-zinc-100 hover:text-amber-500 dark:hover:text-amber-400"
                                  }`}
                                >
                                  <span>
                                    {problem.id}. {problem.title}
                                  </span>
                                  {problem.premium && (
                                    <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400/20 inline" />
                                  )}
                                </Link>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono tabular-nums text-slate-500 dark:text-zinc-400">
                              {problem.acceptance}%
                            </td>
                            <td className="px-4 py-3.5">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  isEasy
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    : isMedium
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                }`}
                              >
                                {UZ_DIFFICULTY[problem.difficulty] ||
                                  DIFFICULTY_LABELS[problem.difficulty] ||
                                  problem.difficulty}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-slate-400 dark:text-zinc-500 text-xs hidden md:table-cell tabular-nums">
                              {problem.publishedAt ? problem.publishedAt.split("T")[0] : "-"}
                            </td>
                            <td className="px-4 py-3.5 text-right pr-6 font-mono font-semibold text-slate-600 dark:text-zinc-400 tabular-nums">
                              +{problem.xp}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-800/30 px-4 py-3 text-xs text-slate-500 dark:text-zinc-400">
                  <span>
                    Ko‘rsatilmoqda: {initialProblems.offset + 1}-
                    {Math.min(initialProblems.offset + initialProblems.limit, initialProblems.count)} /{" "}
                    {initialProblems.count} ta
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateFilters({ page: String(currentPage - 1) })}
                      disabled={currentPage <= 1 || isPending}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-3 font-semibold text-slate-800 dark:text-zinc-200 tabular-nums">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateFilters({ page: String(currentPage + 1) })}
                      disabled={currentPage >= totalPages || isPending}
                      className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* O'NG SIDEBAR (Desktop) */}
          <aside className="hidden w-80 shrink-0 xl:block">
            <div className="space-y-4">

              {/* PROGRESS WIDGETI */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-zinc-100">
                    <Filter className="h-4 w-4 text-emerald-500" /> Yechilgan masalalar
                  </span>
                  <span className="font-semibold tabular-nums text-slate-600 dark:text-zinc-400">
                    {initialStats.solved} / {initialStats.total}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                  <div
                    className="h-full bg-slate-900 dark:bg-white transition-all duration-300"
                    style={{
                      width: `${
                        initialStats.total ? (initialStats.solved / initialStats.total) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* KALENDAR WIDGETI */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-zinc-100">
                    <CalendarIcon className="h-4 w-4 text-amber-500" />
                    {monthNamesUz[currentCalendarDate.getMonth()]}{" "}
                    {currentCalendarDate.getFullYear()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentCalendarDate(
                          new Date(
                            currentCalendarDate.getFullYear(),
                            currentCalendarDate.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 cursor-pointer"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Hafta kunlari */}
                <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mb-1.5">
                  <span>Yak</span>
                  <span>Dush</span>
                  <span>Sesh</span>
                  <span>Chor</span>
                  <span>Pay</span>
                  <span>Jum</span>
                  <span>Shan</span>
                </div>

                {/* Kunlar katakchalari */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarGrid.map((item, idx) => {
                    if (!item) {
                      return <div key={`empty-${idx}`} className="h-7 w-7" />;
                    }

                    const dateObj = new Date(item.dateStr);
                    const isFrom = fromDate === item.dateStr;
                    const isTo = toDate === item.dateStr;

                    const isInRange =
                      fromDate &&
                      toDate &&
                      dateObj >= new Date(fromDate) &&
                      dateObj <= new Date(toDate);

                    const isStartOrEnd = isFrom || isTo;

                    if (isCalendarLoading && !isStartOrEnd && !isInRange) {
                      return <Skeleton key={item.dateStr} className="h-7 w-7 rounded-lg" />;
                    }

                    return (
                      <button
                        type="button"
                        key={item.dateStr}
                        onClick={() => handleCalendarDayClick(item.dateStr)}
                        title={`${item.dateStr}: ${item.count} ta masala`}
                        className={`relative flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer ${
                          isStartOrEnd
                            ? "bg-slate-900 dark:bg-white text-white dark:text-black font-bold shadow-sm"
                            : isInRange
                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold"
                            : item.count > 0
                            ? "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-zinc-700 font-bold"
                            : "text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {item.dayNumber}
                        {item.count > 0 && !isStartOrEnd && !isInRange && (
                          <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TEGLAR WIDGETI */}
              <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-zinc-900/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-zinc-100">
                    <TagIcon className="h-4 w-4 text-amber-500" /> Teglar
                  </span>
                  {selectedTag && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTag("");
                        handleStandardFilterChange({ tag_id: null });
                      }}
                      className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                    >
                      Tozalash
                    </button>
                  )}
                </div>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTag("");
                        handleStandardFilterChange({ tag_id: null });
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                        !selectedTag
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                          : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                      }`}
                    >
                      Barchasi
                    </button>
                    {tags.map((tag) => {
                      const tagIdStr = String(tag.id);
                      const isActive = selectedTag === tagIdStr;

                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleTagSelect(tagIdStr)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                            isActive
                              ? "bg-slate-900 text-white dark:bg-white dark:text-black font-semibold shadow-sm"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-zinc-500">Hozircha teglar mavjud emas.</p>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* SUBSCRIBE TO UNLOCK MODAL */}
        {isPremiumModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-zinc-100">
              <button
                type="button"
                onClick={() => setIsPremiumModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-black dark:bg-white text-amber-400 dark:text-black shadow-lg">
                  <Sparkles className="h-8 w-8" />
                  <div className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 p-1 text-black ring-2 ring-white dark:ring-zinc-900">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                </div>

                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Premium Masalani Ochish
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-xs">
                  Ushbu FAANG intervyu masalasini ko‘rish va eksklyuziv yechimlarga kirish uchun{" "}
                  <span className="font-semibold text-amber-500">PRO obunaga</span> o‘ting.
                </p>

                <div className="mt-6 w-full rounded-2xl bg-slate-50 dark:bg-zinc-800/60 p-4 border border-slate-100 dark:border-white/5 text-left space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Barcha eksklyuziv intervyu masalalariga to‘liq ruxsat</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Batafsil tahlil va matnli yechimlar</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Lightning Judge avtotizimi bilan cheksiz testlash</span>
                  </div>
                </div>

                <div className="mt-6 flex w-full flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPremiumModalOpen(false)}
                    className="w-full sm:w-1/3 rounded-xl border border-slate-200 dark:border-white/10 py-3 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer order-2 sm:order-1"
                  >
                    Yopish
                  </button>
                  <Link
                    href="/subscribe"
                    className="w-full sm:w-2/3 flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black py-3 text-xs font-bold shadow-md hover:opacity-90 active:scale-[0.98] transition cursor-pointer order-1 sm:order-2"
                  >
                    <Sparkles className="h-4 w-4 fill-current" />
                    <span>Obuna bo‘lish</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
