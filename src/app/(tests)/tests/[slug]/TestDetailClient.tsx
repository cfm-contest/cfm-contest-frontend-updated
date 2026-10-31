"use client";

/**
 * Oldindan o‘rnatish (bir marta):
 *   npx shadcn@latest add button badge accordion dialog input checkbox alert skeleton progress separator sonner
 * va layout.tsx ichiga <Toaster richColors position="top-center" /> (sonner) qo‘shing.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronLeft,
  Clock3,
  Loader2,
  Lock,
  LogIn,
  Play,
  Share2,
  Trophy,
  Users,
  ListChecks,
  FileText,
  MessageCircleQuestion,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { STATUS_META, formatDateTime, formatPrice, hasDiscount, type TestStatusValue } from "@/lib/api/tests/tests";
import type { TestDetailData } from "@/lib/api/tests/types";
import { ApiError, apiFetch } from "@/lib/api/tests/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useAuth } from "@/context/AuthContext";

import ResultPanel from "./ResultPanel";
import LeaderboardPanel from "./LeaderboardPanel";
import AnalysisPanel from "./AnalysisPanel";
import PurchaseDialog from "./PurchaseDialog";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type TabId = "info" | "result" | "board" | "analysis";
type DialogId = null | "login" | "enroll" | "start" | "buy";

const TAB_FROM_QUERY: Record<string, TabId> = { natija: "result", reyting: "board", tahlil: "analysis" };
const QUERY_FROM_TAB: Record<TabId, string | null> = {
  info: null,
  result: "natija",
  board: "reyting",
  analysis: "tahlil",
};

// Loyihangizdagi login sahifasiga moslang
const loginHref = (slug: string) => `/login?next=${encodeURIComponent(`/tests/${slug}`)}`;

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const gcal = (d: string) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, "");

function addToCalendar(test: TestDetailData) {
  const esc = (v: string) => v.replace(/[,;\\]/g, (c) => `\\${c}`);
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tests//UZ",
    "BEGIN:VEVENT",
    `UID:${test.slug}@tests`,
    `DTSTAMP:${gcal(new Date().toISOString())}`,
    `DTSTART:${gcal(test.start!)}`,
    `DTEND:${gcal(test.end!)}`,
    `SUMMARY:${esc(test.t)}`,
    `URL:${location.origin}/tests/${test.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${test.slug}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Kalendar fayli yuklandi");
}

async function shareTest(test: TestDetailData) {
  const url = `${location.origin}/tests/${test.slug}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: test.t, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Havola nusxalandi");
  } catch {
    /* foydalanuvchi bekor qildi */
  }
}

type ActionKind = "continue" | "result" | "finished" | "enroll" | "waiting" | "start";

function actionKind(test: TestDetailData, status: TestStatusValue, enrolled: boolean): ActionKind {
  if (test.ss === "in_progress" && status !== "finished") return "continue";
  if (test.ss) return "result";
  if (status === "finished") return "finished";
  if (!enrolled) return "enroll";
  if (status === "upcoming") return "waiting";
  return "start";
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */

export default function TestDetailClient({ test, initialTab }: { test: TestDetailData; initialTab?: string }) {
  const router = useRouter();
  const now = useNow();
  const { user, isAuthenticated, isLoading: authLoading, loginRequiredRedirect } = useAuth();

  const status: TestStatusValue = useMemo(() => {
    if (now === null) return test.status;
    if (new Date(test.end!).getTime() <= now) return "finished";
    if (new Date(test.start!).getTime() > now) return "upcoming";
    return "ongoing";
  }, [now, test]);

  const [enrolled, setEnrolled] = useState(Boolean(test.enr || test.reg || test.ss));
  const [dialog, setDialog] = useState<DialogId>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSession = test.ss !== null && test.ss !== undefined;
  const tabs = useMemo(() => {
    const list: { id: TabId; label: string }[] = [{ id: "info", label: "Ma’lumot" }];
    if (hasSession) list.push({ id: "result", label: "Natijam" });
    if (status === "finished") list.push({ id: "board", label: "Reyting" });
    // Tahlil: test tugagan va foydalanuvchi ro‘yxatdan o‘tgan bo‘lsa
    if (status === "finished" && enrolled) list.push({ id: "analysis", label: "Tahlil" });
    return list;
  }, [hasSession, status, enrolled]);

  const [tab, setTab] = useState<TabId>(TAB_FROM_QUERY[initialTab ?? ""] ?? "info");
  const activeTab = tabs.some((t) => t.id === tab) ? tab : "info";

  const changeTab = (id: TabId) => {
    setTab(id);
    const url = new URL(window.location.href);
    const q = QUERY_FROM_TAB[id];
    if (q) url.searchParams.set("tab", q);
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url);
  };

  const kind = actionKind(test, status, enrolled);

  /* ---- auth tekshiruvi: tugma bosilganda, so‘rovdan OLDIN ---- */
  // AuthContext localStorage'ga tayanadi (optimistik). Yuklanayotgan paytda bloklamaymiz —
  // eskirgan token bo‘lsa, server 401 qaytaradi va handleApiError tozalab /login ga yuboradi.
  const needsLogin = !authLoading && !isAuthenticated;
  const openDialog = (id: Exclude<DialogId, null>) => {
    setError(null);
    setDialog(needsLogin && id !== "login" ? "login" : id);
  };

  const handleApiError = (e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setDialog(null);
      loginRequiredRedirect(); // eskirgan holatni tozalaydi va /login?next=... ga yuboradi
      return;
    }
    setError(e instanceof ApiError ? e.message : "Xatolik yuz berdi. Qayta urinib ko‘ring.");
  };

  const doEnroll = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`${test.slug}/enroll`, { method: "POST", body: {} });
      setEnrolled(true);
      setDialog(null);
      toast.success("Ro‘yxatdan o‘tdingiz");
      router.refresh();
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  const doStart = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`${test.slug}/start`, { method: "POST", body: { code: code.trim() || null } });
      router.push(`/tests/${test.slug}/tasks`);
      return; // busy holati sahifa almashguncha saqlanadi
    } catch (e) {
      handleApiError(e);
    }
    setBusy(false);
  };

  const discounted = hasDiscount(test);
  const priceText = formatPrice(discounted ? test.discount! : test.price);
  const isFree = Number(discounted ? test.discount : test.price) === 0;

  const cta = {
    kind,
    test,
    now,
    onEnroll: () => openDialog(isFree ? "enroll" : "buy"), // pullik bo‘lsa — admin bilan bog‘lanish oynasi
    onStart: () => openDialog("start"),
    onResult: () => changeTab("result"),
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-28 lg:pb-12">
      <Hero test={test} status={status} now={now} cta={cta} />

      {/* ================= BODY ================= */}
      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8 lg:px-8">
        <div className="min-w-0 space-y-5">
          <TabNav tabs={tabs} active={activeTab} onChange={changeTab} />

          <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {activeTab === "info" && <InfoPanel test={test} />}
            {activeTab === "result" && hasSession && <ResultPanel slug={test.slug} />}
            {activeTab === "board" && status === "finished" && (
              <LeaderboardPanel slug={test.slug} title={test.t} start={test.start!} end={test.end!} />
            )}
            {activeTab === "analysis" && status === "finished" && enrolled && <AnalysisPanel slug={test.slug} />}
          </div>
        </div>

        {/* ---- yon panel: bitta yaxlit karta ---- */}
        <aside className="lg:sticky lg:top-16">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                {discounted && <p className="text-sm text-slate-400 line-through">{formatPrice(test.price)}</p>}
                <p className="text-2xl font-black tracking-tight text-slate-950">{isFree ? "Bepul" : priceText}</p>
              </div>
              {test.code && (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <Lock className="size-3" /> Kod bilan
                </Badge>
              )}
            </div>

            <Separator className="my-5" />
            <Stepper status={status} enrolled={enrolled} session={test.ss} />

            <div className="mt-5">
              <CtaButton {...cta} variant="card" />
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10 rounded-xl text-slate-700" onClick={() => shareTest(test)}>
                <Share2 className="size-4" /> Ulashish
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-xl text-slate-700"
                disabled={status === "finished"}
                onClick={() => addToCalendar(test)}
              >
                <CalendarPlus className="size-4" /> Kalendar
              </Button>
            </div>

            <Separator className="my-5" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <Count icon={<Users className="size-4" />} value={test.en} label="Ro‘yxatdan o‘tgan" />
              <Count icon={<Play className="size-4" />} value={test.pn} label="Qatnashgan" />
              <Count icon={<ListChecks className="size-4" />} value={test.qn} label="Savol" />
            </div>
          </div>
        </aside>
      </div>

      {/* ---- mobil pastki panel ---- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[11px] font-medium text-slate-500">Narxi</p>
            <p className="text-base font-black text-slate-900">{isFree ? "Bepul" : priceText}</p>
          </div>
          <div className="min-w-0 flex-1">
            <CtaButton {...cta} variant="card" />
          </div>
        </div>
      </div>

      {/* ================= DIALOGS ================= */}
      <LoginDialog open={dialog === "login"} onClose={() => setDialog(null)} slug={test.slug} />
      <EnrollDialog
        open={dialog === "enroll"}
        onClose={() => setDialog(null)}
        test={test}
        busy={busy}
        error={error}
        onConfirm={doEnroll}
      />
      <PurchaseDialog
        open={dialog === "buy"}
        onClose={() => setDialog(null)}
        test={test}
        priceText={priceText}
        oldPriceText={discounted ? formatPrice(test.price) : null}
        username={user?.username}
      />
      <StartDialog
        open={dialog === "start"}
        onClose={() => setDialog(null)}
        test={test}
        busy={busy}
        error={error}
        onConfirm={doStart}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

type CtaProps = {
  kind: ActionKind;
  test: TestDetailData;
  now: number | null;
  onEnroll: () => void;
  onStart: () => void;
  onResult: () => void;
};

function Hero({
  test,
  status,
  now,
  cta,
}: {
  test: TestDetailData;
  status: TestStatusValue;
  now: number | null;
  cta: CtaProps;
}) {
  const meta = STATUS_META[status];
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = Boolean(test.img) && !imgFailed;

  return (
    <section className="mx-auto w-full max-w-7xl px-3 pt-3 sm:px-6 sm:pt-5 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-black text-white shadow-2xl shadow-black/20 sm:rounded-[2rem]">
        {/* ---- fon: rasm (z-0) -> qoplama (z-10) -> kontent (z-20) ---- */}
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={test.img!}
            alt=""
            aria-hidden="true"
            loading="eager"
            fetchPriority="high"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 z-0 size-full object-cover opacity-70"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]"
          />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/80 to-black/30 lg:bg-gradient-to-r lg:from-black lg:via-black/85 lg:to-black/25" />
        <div className="pointer-events-none absolute -right-24 -top-24 z-10 size-72 rounded-full bg-amber-500/10 blur-[90px] sm:size-[28rem]" />

        <div className="relative z-20 grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end lg:gap-12 lg:p-12">
          {/* ---- chap ---- */}
          <div className="min-w-0">
            <Link
              href="/tests"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-2.5 pr-3.5 text-xs font-medium text-zinc-300 backdrop-blur transition hover:bg-white/10 hover:text-white sm:text-sm"
            >
              <ChevronLeft className="size-4" /> Barcha testlar
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur ${meta.className}`}
              >
                <span className="relative flex size-2">
                  {status === "ongoing" && (
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                  )}
                  <span className="relative inline-flex size-2 rounded-full bg-current" />
                </span>
                {meta.label}
              </span>
              {test.fan && (
                <Badge variant="outline" className="rounded-full border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 backdrop-blur">
                  {test.fan}
                </Badge>
              )}
              {test.code && (
                <Badge variant="outline" className="gap-1 rounded-full border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-zinc-200 backdrop-blur">
                  <Lock className="size-3" /> Kod bilan
                </Badge>
              )}
            </div>

            <h1 className="mt-4 max-w-4xl text-balance break-words text-[clamp(1.75rem,5vw,3.5rem)] font-black leading-[1.1] tracking-tight [overflow-wrap:anywhere]">
              {test.t}
            </h1>

            {test.center && (
              <p className="mt-3 flex items-start gap-2 text-sm text-zinc-300 sm:text-base">
                <Award className="mt-0.5 size-4 shrink-0 text-amber-400 sm:size-5" />
                <span className="min-w-0 break-words">{test.center}</span>
              </p>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:grid-cols-4 sm:gap-3">
              <Fact icon={<ListChecks className="size-4" />} label="Savollar" value={test.qn > 0 ? `${test.qn} ta` : "—"} />
              <Fact icon={<Clock3 className="size-4" />} label="Davomiyligi" value={`${test.min} daqiqa`} />
              <Fact icon={<CalendarClock className="size-4" />} label="Boshlanishi" value={formatDateTime(test.start, true)} />
              <Fact icon={<CalendarClock className="size-4" />} label="Tugashi" value={formatDateTime(test.end, true)} />
            </dl>
          </div>

          {/* ---- o‘ng: hisoblagich + asosiy tugma ---- */}
          <CountdownCard test={test} status={status} now={now} cta={cta} />
        </div>
      </div>
    </section>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur sm:p-3.5">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 sm:text-xs">
        <span className="text-amber-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] font-semibold text-white sm:text-sm">{value}</dd>
    </div>
  );
}

function CountdownCard({
  test,
  status,
  now,
  cta,
}: {
  test: TestDetailData;
  status: TestStatusValue;
  now: number | null;
  cta: CtaProps;
}) {
  const startMs = new Date(test.start!).getTime();
  const endMs = new Date(test.end!).getTime();
  const target = status === "upcoming" ? startMs : endMs;
  const p = now === null || status === "finished" ? null : parts(target - now);
  const progress =
    now === null ? 0 : status === "finished" ? 100 : Math.min(100, Math.max(0, ((now - startMs) / (endMs - startMs)) * 100));

  const cells: [string, string][] = [
    ["kun", p ? String(p.d) : "–"],
    ["soat", p ? String(p.h).padStart(2, "0") : "–"],
    ["daqiqa", p ? String(p.m).padStart(2, "0") : "–"],
    ["soniya", p ? String(p.s).padStart(2, "0") : "–"],
  ];

  const title =
    status === "finished" ? "Test yakunlandi" : status === "upcoming" ? "Boshlanishiga qoldi" : "Tugashiga qoldi";

  return (
    <div className="min-w-0 rounded-3xl border border-white/10 bg-zinc-950/75 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
          <Clock3 className="size-5 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold">{title}</p>
          <p className="truncate text-xs text-zinc-500">
            {status === "finished" ? `${formatDateTime(test.end, true)} da tugagan` : `${test.min} daqiqalik test`}
          </p>
        </div>
      </div>

      {status === "finished" ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
          <Trophy className="size-4 shrink-0 text-amber-400" /> Natijalar va reyting bo‘limida.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {cells.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/[0.05] py-2.5 text-center ring-1 ring-white/10">
              <div className="text-xl font-black tabular-nums text-amber-400 sm:text-2xl">{value}</div>
              <div className="text-[10px] text-zinc-400 sm:text-[11px]">{label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[11px] text-zinc-500">
          <span>Test oynasi</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5 bg-white/10 [&>div]:bg-amber-400" />
      </div>

      <div className="mt-5">
        <CtaButton {...cta} variant="hero" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CTA                                                                 */
/* ------------------------------------------------------------------ */

function CtaButton({
  kind,
  test,
  now,
  onEnroll,
  onStart,
  onResult,
  variant,
}: CtaProps & { variant: "hero" | "card" }) {
  const base = "h-12 w-full rounded-xl text-sm font-semibold";
  const primary =
    variant === "hero"
      ? `${base} bg-amber-400 text-black hover:bg-amber-300`
      : `${base} bg-slate-900 text-white hover:bg-slate-700`;
  const quiet =
    variant === "hero"
      ? `${base} border border-white/15 bg-white/10 text-white hover:bg-white/15`
      : `${base} border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-100`;

  switch (kind) {
    case "continue":
      return (
        <Button asChild className={primary}>
          <Link href={`/tests/${test.slug}/tasks`}>
            <Play className="size-4" /> Testni davom ettirish
          </Link>
        </Button>
      );
    case "result":
      return (
        <Button className={primary} onClick={onResult}>
          <Trophy className="size-4" /> Natijamni ko‘rish
        </Button>
      );
    case "finished":
      return (
        <Button disabled className={quiet}>
          Test tugagan
        </Button>
      );
    case "enroll":
      return (
        <Button className={primary} onClick={onEnroll}>
          <Check className="size-4" /> Ro‘yxatdan o‘tish
        </Button>
      );
    case "waiting": {
      const left = now === null ? null : parts(new Date(test.start!).getTime() - now);
      return (
        <div className="space-y-2 text-center">
          <div
            className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${
              variant === "hero" ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20" : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <Check className="size-4" /> Ro‘yxatdan o‘tgansiz
          </div>
          {left && (
            <p className={`text-xs ${variant === "hero" ? "text-zinc-400" : "text-slate-500"}`}>
              {left.d > 0 ? `${left.d} kun` : `${left.h} soat ${left.m} daqiqa`} keyin boshlanadi
            </p>
          )}
        </div>
      );
    }
    default:
      return (
        <Button className={primary} onClick={onStart}>
          <Play className="size-4" /> Testni boshlash
        </Button>
      );
  }
}

/* ------------------------------------------------------------------ */
/* DIALOGS                                                             */
/* ------------------------------------------------------------------ */

function LoginDialog({ open, onClose, slug }: { open: boolean; onClose: () => void; slug: string }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-2xl bg-amber-100">
            <LogIn className="size-7 text-amber-700" />
          </div>
          <DialogTitle className="text-xl font-black">Avval tizimga kiring</DialogTitle>
          <DialogDescription>
            Testda ro‘yxatdan o‘tish va uni topshirish uchun akkauntingiz bo‘lishi kerak. Kirgach shu sahifaga qaytasiz.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          <Button asChild className="h-11 w-full rounded-xl bg-slate-900 hover:bg-slate-700">
            <Link href={loginHref(slug)}>
              <LogIn className="size-4" /> Kirish
            </Link>
          </Button>
          <Button variant="ghost" className="h-11 w-full rounded-xl" onClick={onClose}>
            Keyinroq
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert" className="rounded-xl">
      <AlertTriangle className="size-4" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function EnrollDialog({
  open,
  onClose,
  test,
  busy,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  test: TestDetailData;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  const discounted = hasDiscount(test);
  const free = Number(discounted ? test.discount : test.price) === 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Ro‘yxatdan o‘tish</DialogTitle>
          <DialogDescription>{test.t}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
          <Row label="Boshlanishi" value={formatDateTime(test.start, true)} />
          <Row label="Davomiyligi" value={`${test.min} daqiqa`} />
          <Row label="Narxi" value={free ? "Bepul" : formatPrice(discounted ? test.discount! : test.price)} strong />
        </div>

        {error && <ErrorAlert message={error} />}

        <DialogFooter className="gap-2 sm:flex-row">
          <Button variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button className="h-11 rounded-xl bg-slate-900 hover:bg-slate-700" disabled={busy} onClick={onConfirm}>
            {busy && <Loader2 className="size-4 animate-spin" />} Tasdiqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StartDialog({
  open,
  onClose,
  test,
  busy,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  test: TestDetailData;
  busy: boolean;
  error: string | null;
  onConfirm: (code: string) => void;
}) {
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState("");
  const canStart = agree && (!test.code || code.trim().length > 0) && !busy;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Testni boshlashga tayyormisiz?</DialogTitle>
          <DialogDescription>{test.t}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-slate-50 p-3 text-center">
            <div className="text-xl font-black text-slate-900">{test.qn > 0 ? test.qn : "—"}</div>
            <div className="text-xs text-slate-500">savol</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 text-center">
            <div className="text-xl font-black text-slate-900">{test.min}</div>
            <div className="text-xs text-slate-500">daqiqa</div>
          </div>
        </div>

        <Alert className="rounded-xl border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="size-4 text-amber-600" />
          <AlertTitle>Muhim</AlertTitle>
          <AlertDescription className="text-amber-800">
            Boshlagach vaqt to‘xtamaydi. Sahifani yopsangiz ham taymer ishlayveradi. Yuborilgan javobni o‘zgartirib bo‘lmaydi.
          </AlertDescription>
        </Alert>

        {test.code && (
          <div className="space-y-1.5">
            <label htmlFor="access-code" className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Lock className="size-3.5" /> Kirish kodi
            </label>
            <Input
              id="access-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              placeholder="Tashkilotchi bergan kod"
              className="h-11 rounded-xl"
            />
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
          <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
          <span>Qoidalar bilan tanishdim va testni halol topshirishga roziman.</span>
        </label>

        {error && <ErrorAlert message={error} />}

        <DialogFooter className="gap-2 sm:flex-row">
          <Button variant="outline" className="h-11 rounded-xl" disabled={busy} onClick={onClose}>
            Bekor qilish
          </Button>
          <Button
            className="h-11 rounded-xl bg-amber-500 text-white hover:bg-amber-600"
            disabled={!canStart}
            onClick={() => onConfirm(code)}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} Boshlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-black text-slate-900" : "font-semibold text-slate-800"}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* body                                                                */
/* ------------------------------------------------------------------ */

function TabNav({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: TabId; label: string }[];
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Test bo‘limlari"
      className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={on}
            aria-controls={`panel-${t.id}`}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 px-4 pb-3 pt-2 text-sm font-semibold transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${
              on ? "text-slate-950 after:bg-amber-500" : "text-slate-500 after:bg-transparent hover:text-slate-800"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function Count({ icon, value, label }: { icon: React.ReactNode; value?: number; label: string }) {
  return (
    <div>
      <div className="mx-auto flex w-fit items-center gap-1.5 text-slate-400">{icon}</div>
      <div className="mt-1 text-xl font-black tabular-nums text-slate-900">{value ?? 0}</div>
      <div className="text-[11px] font-medium leading-tight text-slate-500">{label}</div>
    </div>
  );
}

const AUDIENCES = [
  {
    id: "students",
    label: "O‘quvchilar",
    before:
      "Imtihonga tayyorgarlik ko‘p, lekin o‘z darajasini aniq bilmaydi: mashqlar tartibsiz va natija o‘lchanmaydi.",
    after:
      "Rasch modeli asosidagi adolatli ball, daraja va reyting orqali o‘z o‘rnini ko‘radi hamda qaysi mavzularni kuchaytirish kerakligini aniq biladi.",
  },
  {
    id: "teachers",
    label: "O‘qituvchilar",
    before:
      "Milliy attestatsiya va kasbiy rivojlanish uchun o‘z bilimini ishonchli, boshqalar bilan solishtiriladigan o‘lchovda baholay olmaydi.",
    after:
      "Vaqt chegarasi bilan topshiriladigan testlar va batafsil natijalar orqali darajasini baholaydi, attestatsiyaga ishonch bilan tayyorlanadi.",
  },
  {
    id: "applicants",
    label: "Abituriyentlar",
    before:
      "Tayyorgarlik tizimsiz: kamchiliklar imtihondan oldin emas, imtihonning o‘zida aniqlanadi va haqiqiy sharoitga o‘rganish yo‘q.",
    after:
      "Haqiqiy imtihon muhitida mashq qiladi, natijasini boshqa ishtirokchilar bilan solishtiradi va o‘sishini bosqichma-bosqich kuzatadi.",
  },
] as const;

const AUDIENCE_PERKS = ["Rasch asosida adolatli ball", "Ochiq reyting", "Vaqtli imtihon muhiti"];

function TestAudience() {
  const [active, setActive] = useState<string>(AUDIENCES[0].id);
  const current = AUDIENCES.find((a) => a.id === active) ?? AUDIENCES[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-amber-600">BILIM · TAYYORGARLIK · NATIJA</p>
        <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Testlar kim uchun?
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
          SAT, xalqaro sertifikat imtihonlari va milliy attestatsiyaga tayyorlanayotgan har bir inson uchun.
        </p>
      </div>

      {/* segmentli tanlagich */}
      <div
        role="tablist"
        aria-label="Auditoriya"
        className="mx-auto mt-6 flex w-fit max-w-full overflow-x-auto rounded-full bg-slate-100 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {AUDIENCES.map((a) => {
          const on = a.id === active;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(a.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-5 ${
                on
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>

      <div key={current.id} className="mt-5 grid gap-3 duration-200 animate-in fade-in-0 md:grid-cols-2">
        <article className="rounded-2xl bg-slate-50 p-5 ring-1 ring-inset ring-slate-200/80 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">HOZIRGI HOLAT</p>
          <p className="mt-3 text-base font-medium leading-7 text-slate-600 sm:text-[17px]">{current.before}</p>
        </article>

        <article className="rounded-2xl bg-slate-950 p-5 text-white sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-amber-400">TESTDAN KEYIN</p>
          <p className="mt-3 text-base font-medium leading-7 text-slate-100 sm:text-[17px]">{current.after}</p>
        </article>
      </div>

      <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5">
        {AUDIENCE_PERKS.map((perk) => (
          <li key={perk} className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="size-3" />
            </span>
            {perk}
          </li>
        ))}
      </ul>
    </section>
  );
}

function InfoPanel({ test }: { test: TestDetailData }) {
  const paid = Number(hasDiscount(test) ? test.discount : test.price) > 0;

  const faqs = [
    ...(paid
      ? [
          {
            question: "Pullik testni qanday sotib olaman?",
            answer:
              "“Ro‘yxatdan o‘tish” tugmasini bosing — admin bilan Telegram yoki email orqali bog‘lanish oynasi ochiladi. Xabar avtomatik tayyorlanadi, siz faqat yuborasiz. Admin to‘lov tartibini tushuntiradi va to‘lov tasdiqlangach sizni testga qo‘shadi.",
          },
        ]
      : []),
    {
      question: "Rasch modeli nima?",
      answer:
        "Rasch modeli — ishtirokchilarning bilim darajasi va test savollarining murakkabligini hisobga oluvchi statistik baholash usuli. Ushbu model yordamida test natijalari hisoblanadi.",
    },
    {
      question: "Testni boshlaganimdan keyin tanaffus qilsam bo‘ladimi?",
      answer:
        "Test boshlanganidan keyin vaqt hisoblanishda davom etadi. Shu sababli testni boshlashdan oldin yetarli vaqt va barqaror internet mavjudligiga ishonch hosil qiling.",
    },
    {
      question: "Javobni yuborganimdan keyin o‘zgartira olamanmi?",
      answer:
        "Yo‘q. Javob yuborilgach, uni o‘zgartirish mumkin emas. Javobni yuborishdan oldin tanlovingizni diqqat bilan tekshiring.",
    },
    {
      question: "Test natijam qachon chiqadi?",
      answer:
        "Natija test yakunlangandan keyin Rasch modeli bo‘yicha hisoblanadi va belgilangan tartibda e’lon qilinadi.",
    },
    {
      question: "To‘g‘ri javoblarni qachon ko‘ra olaman?",
      answer: "To‘g‘ri javoblar natijalar e’lon qilingandan keyin ko‘rsatiladi.",
    },
    {
      question: "Testni boshlash uchun kirish kodi kerakmi?",
      answer: test.code
        ? "Ha. Ushbu testni boshlash uchun tashkilotchi taqdim etgan kirish kodini kiritishingiz kerak."
        : "Ushbu test uchun alohida kirish kodi talab qilinmaydi.",
    },
    {
      question: "Internet uzilib qolsa nima bo‘ladi?",
      answer:
        "Internet uzilishi test jarayoniga ta’sir qilishi mumkin. Barqaror internetdan foydalaning. Javoblarni saqlash va testni davom ettirish imkoniyati platformaning texnik sozlamalariga bog‘liq.",
    },
    {
      question: "Testni qayta topshirish mumkinmi?",
      answer:
        "Ushbu test har bir ishtirokchi uchun faqat bir marta topshirishga mo‘ljallangan. Qayta topshirish imkoniyati mavjud bo‘lsa, u tashkilotchi tomonidan belgilanadi.",
    },
  ];
  return (
    <div className="space-y-4">
      {/* Test haqida */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText className="size-[18px]" />
          </span>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">Test haqida</h2>
        </div>

        <div className="mt-4 break-words text-[15px] leading-7 text-slate-600 [&_a]:break-all [&_a]:font-medium [&_a]:text-amber-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-amber-800 [&_p+p]:mt-3">
          {test.desc ? <MarkdownRenderer content={test.desc} /> : <p className="text-slate-400">Tavsif kiritilmagan.</p>}
        </div>
      </section>

      <TestAudience />

      {/* FAQ — shadcn Accordion */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 p-5 pb-2 sm:p-7 sm:pb-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <MessageCircleQuestion className="size-[18px]" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">Ko‘p beriladigan savollar</h2>
            <p className="text-sm text-slate-500">Test va natijalar haqida muhim ma’lumotlar</p>
          </div>
        </div>

        <Accordion type="single" collapsible defaultValue="faq-0" className="px-5 pb-1 sm:px-7">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`} className="border-slate-200/80">
              <AccordionTrigger className="py-4 text-left text-[15px] font-semibold text-slate-800 hover:text-slate-950 hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-7 text-slate-600">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-center text-xs text-slate-500 sm:px-7">
          Qo‘shimcha savollaringiz bo‘lsa, test tashkilotchisiga murojaat qiling.
        </p>
      </section>
    </div>
  );
}

function Stepper({
  status,
  enrolled,
  session,
}: {
  status: TestStatusValue;
  enrolled: boolean;
  session: TestDetailData["ss"];
}) {
  const taken = session !== null && session !== undefined && session !== "in_progress";
  const steps = [
    { label: "Ro‘yxatdan o‘tish", done: enrolled || Boolean(session) },
    { label: "Testni topshirish", done: taken, current: enrolled && !taken && status !== "finished" },
    { label: "Natija e’loni", done: status === "finished" && taken, current: taken && status !== "finished" },
  ];

  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-3 text-sm">
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              s.done
                ? "bg-emerald-500 text-white"
                : s.current
                  ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                  : "bg-slate-100 text-slate-400"
            }`}
          >
            {s.done ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={s.done || s.current ? "font-semibold text-slate-900" : "text-slate-500"}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
