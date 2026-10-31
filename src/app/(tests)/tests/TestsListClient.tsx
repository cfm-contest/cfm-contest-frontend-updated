"use client";

import { backendRequest } from "@/lib/api/django/backend";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileQuestion,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import {
  STATUS_META,
  TEST_PAGE_SIZE,
  TEST_STATUSES,
  buildTestsQuery,
  formatDateTime,
  formatPrice,
  hasDiscount,
  parseOffset,
  parsePositiveInt,
  parseStatus,
  type TestItem,
  type TestListResponse,
  type TestStatus,
  type TestSubject,
} from "@/lib/api/tests/tests";

interface Props {
  initialTests: TestListResponse;
  subjects: TestSubject[];
  initialError: string | null;
}

type Patch = { status?: TestStatus; search?: string; fan?: string; offset?: number };

export default function TestsListClient({
  initialTests,
  subjects,
  initialError,
}: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL — yagona haqiqat manbai
  const key = searchParams.toString();
  const status = parseStatus(searchParams.get("status"));
  const search = (searchParams.get("search") ?? "").trim();
  const fan = parsePositiveInt(searchParams.get("fan"));
  const offset = parseOffset(searchParams.get("offset"));

  const [tests, setTests] = useState(initialTests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [input, setInput] = useState(search);

  const skipKey = useRef<string | null>(key);

  const navigate = useCallback(
    (patch: Patch, mode: "push" | "replace" = "push") => {
      const q = new URLSearchParams(window.location.search);
      const set = (k: string, v: string) => (v ? q.set(k, v) : q.delete(k));

      if (patch.status !== undefined)
        set("status", patch.status === "all" ? "" : patch.status);
      if (patch.search !== undefined) set("search", patch.search.trim());
      if (patch.fan !== undefined) set("fan", patch.fan);
      // Har qanday filter o'zgarishida offset 0 ga qaytadi, faqat pagination uni beradi
      set("offset", patch.offset ? String(patch.offset) : "");

      const qs = q.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  /* ---- URL o'zgarganda ma'lumot olish ---- */
  useEffect(() => {
    // Birinchi render: ma'lumot SSR'dan kelgan
    if (skipKey.current === key && reloadTick === 0) {
      skipKey.current = null;
      return;
    }
    skipKey.current = null;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const query = buildTestsQuery({ status, search, fan, offset });
        const res = await backendRequest(`/api/tests?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("fetch failed");
        setTests((await res.json()) as TestListResponse);
      } catch {
        if (controller.signal.aborted) return;
        setError("Testlarni yuklab bo‘lmadi. Qayta urinib ko‘ring.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
    // status/search/fan/offset `key`dan olinadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadTick]);

  /* ---- Qidiruv inputi: URL -> input (Back/Forward) ---- */
  useEffect(() => {
    setInput((prev) => (prev.trim() === search ? prev : search));
  }, [search]);

  /* ---- Qidiruv inputi: input -> URL (debounce) ---- */
  useEffect(() => {
    const value = input.trim();
    if (value === search) return;
    const timer = window.setTimeout(
      () => navigate({ search: value }, "replace"),
      300,
    );
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const clearFilters = () => {
    setInput("");
    setMobileFilters(false);
    navigate({ status: "all", search: "", fan: "" });
  };

  const goTo = (nextOffset: number) => {
    navigate({ offset: nextOffset });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentStatusLabel =
    TEST_STATUSES.find((s) => s.value === status)?.label ?? "Barchasi";
  const hasFilters = Boolean(search || fan || status !== "all");
  const count = tests.items.length;

  return (
    <main className="min-h-screen bg-slate-50 py-8 text-slate-900 dark:bg-black dark:text-zinc-100 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative isolate mb-8 overflow-hidden rounded-3xl border border-white/10 bg-black p-6 text-white shadow-2xl shadow-black/20 sm:p-8 lg:p-10"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 z-0 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-[28rem]" />
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400 backdrop-blur">
                <span className="size-1.5 rounded-full bg-amber-400" />
                Milliy Sertifikat & Attestatsiya Testlari
              </span>
              <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                Bilimingizni Sinang va Imtihonlarga Tayyorlaning
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-zinc-300 sm:text-base">
                O‘zbekiston milliy attestatsiya va sertifikat sinovlari formati bo‘yicha fan testlari, natijalar tahlili va real vaqt reytingi.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 backdrop-blur shrink-0 self-start lg:self-auto">
              <FileQuestion className="size-6 text-amber-400" />
              <div>
                <p className="text-xl font-black leading-none text-white">
                  {loading ? "…" : count}
                </p>
                <p className="mt-1 text-[11px] font-medium text-zinc-400">
                  Mavjud testlar
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filterlar */}
        <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-zinc-950 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={100}
                placeholder="Test nomi bo‘yicha qidirish..."
                className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:bg-zinc-900"
              />
              {input && (
                <button
                  type="button"
                  aria-label="Qidiruvni tozalash"
                  onClick={() => {
                    setInput("");
                    navigate({ search: "" });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>

            <div className="flex gap-2">
              <select
                value={fan ? String(fan) : ""}
                onChange={(e) => navigate({ fan: e.target.value })}
                aria-label="Fan bo‘yicha filter"
                className="h-12 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 sm:min-w-44"
              >
                <option value="">Barcha fanlar</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.n}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setMobileFilters((v) => !v)}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:hidden"
              >
                <SlidersHorizontal className="size-4" />
                Filter
              </button>
            </div>
          </div>

          <div
            className={`${mobileFilters ? "flex" : "hidden"} mt-4 flex-wrap gap-2 lg:flex`}
          >
            {TEST_STATUSES.map((item) => {
              const active = status === item.value;
              return (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => navigate({ status: item.value })}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {active && <Check className="size-3.5" />}
                  {item.label}
                </button>
              );
            })}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="size-3.5" />
                Tozalash
              </button>
            )}
          </div>
        </section>

        {/* Sarlavha */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {currentStatusLabel}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {search
                ? `“${search}” bo‘yicha natijalar`
                : "Mavjud testlar ro‘yxati"}
            </p>
          </div>
          {count > 0 && (
            <span className="text-xs text-slate-500">
              {offset + 1}–{offset + count}
            </span>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadTick((n) => n + 1)}
              className="font-semibold underline underline-offset-4"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Ro'yxat */}
        <div className="relative mt-5">
          {loading && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-slate-50/70 backdrop-blur-[1px]">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {count > 0 ? (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {tests.items.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </motion.div>
            ) : !loading && !error ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                  <FileQuestion className="size-6" />
                </div>
                <h3 className="mt-4 font-bold text-slate-900">
                  Testlar topilmadi
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Bu filter bo‘yicha test yo‘q. Boshqa holat yoki fanni tanlab
                  ko‘ring.
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Barcha testlar
                  </button>
                )}
              </div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {(offset > 0 || tests.hn) && (
          <nav
            aria-label="Testlar sahifalari"
            className="mt-8 flex items-center justify-between gap-3"
          >
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => goTo(Math.max(0, offset - TEST_PAGE_SIZE))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
              Oldingi
            </button>

            <span className="text-xs text-slate-500">
              {Math.floor(offset / TEST_PAGE_SIZE) + 1}-sahifa
            </span>

            <button
              type="button"
              disabled={!tests.hn || tests.no === null || loading}
              onClick={() => tests.no !== null && goTo(tests.no)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Keyingi
              <ChevronRight className="size-4" />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}

function TestCard({ test }: { test: TestItem }) {
  const meta = STATUS_META[test.status];
  const discounted = hasDiscount(test);

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-zinc-900/90 dark:hover:border-white/20"
    >
      <Link
        href={`/tests/${encodeURIComponent(test.slug)}`}
        className="block focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-amber-500"
      >
        <div className="relative aspect-[16/8] overflow-hidden bg-slate-100 dark:bg-zinc-800">
          {test.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={test.img}
              alt={test.t}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-900">
              <FileQuestion className="size-10 text-slate-400 dark:text-zinc-600" />
            </div>
          )}

          <span
            className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ring-inset ${meta.className}`}
          >
            {meta.label}
          </span>

          {test.reg && (
            <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm dark:bg-zinc-900/95 dark:text-emerald-400">
              <Check className="mr-1 inline size-3.5" />
              Ro‘yxatdan o‘tgan
            </span>
          )}
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-amber-600 dark:text-amber-400">
              {test.fan ?? "Fan belgilanmagan"}
            </span>
            <span className="truncate text-[11px] text-slate-400 dark:text-zinc-500">
              {test.center ?? ""}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 min-h-12 text-base font-bold leading-6 text-slate-900 transition group-hover:text-amber-600 dark:text-white dark:group-hover:text-amber-400">
            {test.t}
          </h3>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4" />
              {test.min} daqiqa
            </span>
            {test.start && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-4" />
                {formatDateTime(test.start)}
              </span>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/5">
            <div>
              {discounted && (
                <p className="text-xs text-slate-400 line-through dark:text-zinc-500">
                  {formatPrice(test.price)}
                </p>
              )}
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {formatPrice(discounted ? test.discount! : test.price)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 transition group-hover:text-amber-600 dark:text-zinc-300 dark:group-hover:text-amber-400">
              Ko‘rish
              <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
