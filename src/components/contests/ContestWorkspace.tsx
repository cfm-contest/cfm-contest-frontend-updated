"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  AlertCircle, ArrowLeft, Ban, CalendarClock, CheckCircle2, CircleDashed, Code2, FileQuestion, Flag,
  Hourglass, Info, ListChecks, Loader2, Lock, LogIn, LogOut, Play, Timer, Trophy, Users, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  PHASE_INFO, SCORING_HINT, SCORING_LABEL, isIndividual, type ContestTask, type PhaseTone,
} from "@/lib/api/contests/contests";
import {
  ContestActionError, fetchContest, finishContest, leaveContest, registerSolo, registerTeam, startContest,
  type ContestFull,
} from "@/lib/api/contests/contest-actions";
import {
  EmptyState, StatusBadge, formatClock, formatDateTime, formatDuration, formatScore, useTick,
} from "@/components/contests/contest-ui";
import { ParticipantsTab, StandingsTab, SubmissionsTab } from "@/components/contests/ContestTabs";
import { ContestGuard } from "@/components/contests/ContestGuard";
import { TeamRegisterDialog, type TeamRegisterPayload } from "@/components/contests/TeamRegisterDialog";
import { MarkdownRenderer } from "../MarkdownRenderer";
import { VideoPlayer } from "../VideoPlayer";

const TAB_IDS = ["overview", "tasks", "standings", "submissions", "users"] as const;
type TabId = (typeof TAB_IDS)[number];

const TONE_ICON: Record<PhaseTone, { icon: React.ElementType; className: string }> = {
  info: { icon: Info, className: "bg-muted text-muted-foreground" },
  success: { icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  warning: { icon: AlertCircle, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  danger: { icon: Ban, className: "bg-destructive/15 text-destructive" },
};

// =========================================================
// Asosiy komponent
// =========================================================
export function ContestWorkspace({ contest }: { contest: ContestFull }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState(contest);
  const [offsetMs, setOffsetMs] = useState(() => new Date(contest.sn).getTime() - Date.now());
  const [busy, setBusy] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [tab, setTab] = useState<TabId>(() => {
    const t = searchParams.get("tab");
    return TAB_IDS.includes(t as TabId) ? (t as TabId) : "overview";
  });

  const { perm, na } = data;
  const isGym = data.k === "gym";
  const registered = data.u !== null;
  const running = data.ph === "running";
  const phase = PHASE_INFO[data.ph];
  const ToneIcon = TONE_ICON[phase.tone].icon;
  const problemLetters = data.ps.filter((t) => t.k === "p").map((t) => t.l);
  const nextTask = data.ps.find((t) => !t.st) ?? data.ps[0];
  const tasksHref = nextTask ? `/contests/${data.s}/tasks/${nextTask.l}` : null;
  const showSummary = registered && !isGym && ["finished", "ended", "practice"].includes(data.ph);

  const reload = useCallback(async (): Promise<ContestFull | null> => {
    try {
      const fresh = await fetchContest(contest.s);
      setData(fresh);
      setOffsetMs(new Date(fresh.sn).getTime() - Date.now());
      return fresh;
    } catch {
      return null; // jim: eski ma'lumot qoladi
    }
  }, [contest.s]);

  const changeTab = useCallback((value: string) => {
    setTab(value as TabId);
    const url = new URL(window.location.href);
    if (value === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  }, []);

  function fail(e: unknown) {
    if (!(e instanceof ContestActionError)) {
      toast.error("Kutilmagan xatolik yuz berdi.");
      return;
    }
    const raw = e.extra?.conflicts;
    const names = Array.isArray(raw)
      ? raw.map((c) => (typeof c === "object" && c ? ((c as any).u ?? (c as any).username ?? (c as any).i) : c)).join(", ")
      : null;
    toast.error(e.message, names ? { description: `Band a'zolar: ${names}` } : undefined);
    if (e.status === 409 || e.code === "registration_closed") void reload(); // holat o'zgargan bo'lishi mumkin
  }

  async function run(action: () => Promise<{ mes?: string; message?: string }>, fallback: string) {
    setBusy(true);
    try {
      const res = await action();
      toast.success(res.mes ?? res.message ?? fallback);
      await reload();
      return true;
    } catch (e) {
      fail(e);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    if (perm.key && !keyOpen) return setKeyOpen(true);
    if (await run(() => registerSolo(data.s, accessKey.trim() || undefined), "Musobaqaga ro'yxatdan o'tdingiz.")) {
      setKeyOpen(false);
      setAccessKey("");
    }
  }

  async function handleTeamRegister(p: TeamRegisterPayload) {
    if (await run(() => registerTeam(data.s, p), "Jamoangiz ro'yxatdan o'tdi.")) setTeamOpen(false);
  }

  /** Boshlash -> yangilangan ma'lumotdan birinchi masalani olib tasks/[alfa] ga yuboradi */
  async function handleStart() {
    setBusy(true);
    try {
      const res = await startContest(data.s);
      toast.success(res.mes ?? "Musobaqa boshlandi.");
      const fresh = await reload();
      const first = fresh?.ps?.[0]?.l;
      setNavigating(true);
      router.push(first ? `/contests/${data.s}/tasks/${first}` : `/contests/${data.s}?tab=tasks`);
    } catch (e) {
      fail(e);
      setBusy(false);
    }
  }

  const start = () => (isIndividual(data.pm) ? setStartOpen(true) : void handleStart());
  const working = busy || navigating;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <ContestGuard slug={data.s} active={running && perm.rec} />

      <Link
        href="/contests"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Musobaqalar
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {isGym ? <Badge variant="secondary">Mashg'ulot</Badge> : <StatusBadge status={data.ss} />}
          {data.vis === "private" ? (
            <Badge variant="outline" className="gap-1 font-normal"><Lock className="size-3" /> Maxfiy</Badge>
          ) : null}
          {data.pt === "team" ? (
            <Badge variant="outline" className="gap-1 font-normal"><Users className="size-3" /> Jamoaviy</Badge>
          ) : null}
        </div>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{data.t}</h1>
      </header>

      {/* ------------------------------ Holat va amallar ------------------------------ */}
      <section className="rounded-xl border bg-card" aria-label="Holat">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
          <div className="flex flex-1 items-start gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", TONE_ICON[phase.tone].className)}>
              <ToneIcon className="size-5" />
            </span>
            <div className="space-y-1 pt-1.5">
              <p className="text-sm font-medium" role="status">{phase.text}</p>
              {data.team?.my ? (
                <p className="text-xs text-muted-foreground">
                  Jamoa: <span className="font-medium text-foreground">{data.team.my.n}</span> · {data.team.my.mc} a'zo ·{" "}
                  {perm.cap ? "kapitan" : "a'zo"}
                </p>
              ) : null}
              {running && perm.rec ? (
                <p className="text-xs text-muted-foreground">
                  Boshqa oynaga o'tish va nusxa ko'chirish qayd etiladi.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <TimerBlock data={data} offsetMs={offsetMs} onZero={reload} />

            {na === "login" ? (
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent(`/contests/${data.s}`)}`}>
                  <LogIn className="size-4" /> Kirish
                </Link>
              </Button>
            ) : null}

            {na === "register" || na === "register_key" ? (
              <Button onClick={handleRegister} disabled={working}>
                {busy && !keyOpen ? <Loader2 className="size-4 animate-spin" /> : null}
                Ro'yxatdan o'tish
              </Button>
            ) : null}

            {na === "register_team" ? (
              <Button onClick={() => setTeamOpen(true)} disabled={working}>
                <Users className="size-4" /> Jamoa bilan ro'yxatdan o'tish
              </Button>
            ) : null}

            {na === "start" ? (
              <Button onClick={start} disabled={working}>
                {working ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Boshlash
              </Button>
            ) : null}

            {(na === "solve" || na === "practice") && tasksHref ? (
              <Button asChild>
                <Link href={tasksHref}>
                  <ListChecks className="size-4" /> {na === "solve" ? "Masalalarga o'tish" : "Mashq qilish"}
                </Link>
              </Button>
            ) : null}

            {perm.fin && running ? (
              <Button variant="outline" onClick={() => setFinishOpen(true)} disabled={working}>
                <Flag className="size-4" /> Yakunlash
              </Button>
            ) : null}

            {perm.leave ? (
              <Button variant="ghost" size="sm" onClick={() => setLeaveOpen(true)} disabled={working}>
                <LogOut className="size-4" /> Chiqish
              </Button>
            ) : null}
          </div>
        </div>

        {registered && data.u && !isGym && !showSummary ? (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl border-t bg-border sm:grid-cols-4 lg:grid-cols-5">
            <Stat label="Ball" value={formatScore(data.u.sc)} />
            <Stat label="O'rin" value={data.u.rk ? `#${data.u.rk}` : "—"} />
            <Stat label="To'g'ri / xato" value={`${data.u.ok} / ${data.u.wr}`} />
            {data.ct === "icpc" ? <Stat label="Jarima" value={`${data.u.pn} daq`} /> : null}
            <Stat label="Sarflangan vaqt" value={formatClock(data.u.ts)} />
          </dl>
        ) : null}

        {showSummary ? <ResultSummary data={data} /> : null}
      </section>

      {/* ------------------------------ Tablar ------------------------------ */}
      <Tabs value={tab} onValueChange={changeTab} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview" className="gap-2"><Info className="size-4" /> Umumiy</TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <ListChecks className="size-4" /> Masalalar
            {data.ps.length > 0 ? <span className="tabular-nums text-muted-foreground">{data.ps.length}</span> : null}
          </TabsTrigger>
          {perm.lb ? (
            <TabsTrigger value="standings" className="gap-2"><Trophy className="size-4" /> Natijalar</TabsTrigger>
          ) : null}
          <TabsTrigger value="submissions" className="gap-2"><Code2 className="size-4" /> Urinishlar</TabsTrigger>
          {perm.pl ? (
            <TabsTrigger value="users" className="gap-2"><Users className="size-4" /> Ishtirokchilar</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="overview"><OverviewTab data={data} /></TabsContent>
        <TabsContent value="tasks"><TasksTab data={data} /></TabsContent>
        {perm.lb ? (
          <TabsContent value="standings"><StandingsTab slug={data.s} scoring={data.ct} /></TabsContent>
        ) : null}
        <TabsContent value="submissions">
          <SubmissionsTab slug={data.s} letters={problemLetters} canFilterMine={registered || isGym} />
        </TabsContent>
        {perm.pl ? <TabsContent value="users"><ParticipantsTab slug={data.s} /></TabsContent> : null}
      </Tabs>

      {/* ------------------------------ Dialoglar ------------------------------ */}
      <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
        <DialogContent>
          <form onSubmit={(e) => { e.preventDefault(); void handleRegister(); }} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Kirish kaliti</DialogTitle>
              <DialogDescription>Bu maxfiy musobaqa. Tashkilotchi bergan kalitni kiriting.</DialogDescription>
            </DialogHeader>
            <Input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              placeholder="Kalit"
              autoComplete="off"
              autoFocus
              aria-label="Kirish kaliti"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setKeyOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={busy || !accessKey.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Ro'yxatdan o'tish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TeamRegisterDialog
        open={teamOpen}
        onOpenChange={setTeamOpen}
        team={data.team}
        needKey={perm.key}
        busy={busy}
        onSubmit={handleTeamRegister}
      />

      <AlertDialog open={startOpen} onOpenChange={setStartOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Musobaqani boshlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Boshlagan paytingizdan boshlab {formatDuration(data.tm.d)} vaqtingiz hisoblanadi
              {data.pt === "team" ? " (butun jamoa uchun)" : ""}. Vaqtni to'xtatib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hozir emas</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleStart()}>Boshlash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Musobaqani yakunlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakunlagandan keyin yangi yechim yubora olmaysiz. Masalalar musobaqa tugagach qayta ochiladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Davom etaman</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run(() => finishContest(data.s), "Musobaqa yakunlandi.")}>
              Yakunlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ro'yxatdan chiqasizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {data.pt === "team" ? "Butun jamoangiz ro'yxatdan chiqadi. " : ""}
              Keyin qayta ro'yxatdan o'tishingiz mumkin (muddat tugamagan bo'lsa).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Qolaman</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run(() => leaveContest(data.s), "Ro'yxatdan chiqdingiz.")}>
              Chiqish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =========================================================
// Yordamchi bo'laklar
// =========================================================
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Vaqt tugagan/yakunlangan ishtirokchi uchun: yechilgan masalalar halqasi + natijalar */
function ResultSummary({ data }: { data: ContestFull }) {
  const u = data.u!;
  const total = data.cnt.p ?? 0;
  const pct = total > 0 ? (u.ok * 100) / total : 0;
  const title = data.ph === "practice" || data.ph === "ended" ? "Musobaqa yakunlangan" : "Ishtirokingiz yakunlandi";

  return (
    <div className="flex flex-col items-center gap-5 border-t p-5 sm:flex-row">
      <div className="size-28 shrink-0 text-emerald-500">
        <CircularProgressbar
          value={pct}
          text={`${u.ok}/${total}`}
          styles={buildStyles({
            pathColor: "currentColor",
            textColor: "currentColor",
            trailColor: "rgba(128,128,128,0.2)",
            textSize: "22px",
            pathTransitionDuration: 0.6,
          })}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {total > 0 ? `${total} ta masaladan ${u.ok} tasi yechildi.` : "Natijalaringiz saqlandi."}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          <MiniStat label="Ball" value={formatScore(u.sc)} />
          <MiniStat label="O'rin" value={u.rk ? `#${u.rk}` : "—"} />
          <MiniStat label="Sarflangan vaqt" value={formatClock(u.ts)} />
          {data.ct === "icpc" ? <MiniStat label="Jarima" value={`${u.pn} daq`} /> : null}
          {u.rd !== null && data.rt.ir ? (
            <MiniStat label="Reyting" value={`${u.rd > 0 ? "+" : ""}${u.rd}`} />
          ) : null}
        </dl>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** Contest davomida: qolgan vaqt halqasi. Boshqa holatlarda: oddiy taymer. */
function TimerBlock({
  data, offsetMs, onZero,
}: {
  data: ContestFull; offsetMs: number; onZero: () => unknown;
}) {
  const tick = useTick();
  const fired = useRef<string | null>(null);

  let label: string | null = null;
  let target: string | null = null;
  const running = data.ph === "running";

  if (data.k !== "gym") {
    if (running) { label = "Qolgan vaqtingiz"; target = data.tm.ud ?? data.et; }
    else if (data.ss === "upcoming" && data.tm.st) { label = "Boshlanishiga"; target = data.tm.st; }
    else if (data.ss === "ongoing" && data.tm.et) { label = "Musobaqa tugashiga"; target = data.tm.et; }
  }

  const remainingMs = target && tick !== 0 ? new Date(target).getTime() - (tick * 1000 + offsetMs) : null;

  useEffect(() => {
    if (!target || remainingMs === null || remainingMs > 0 || fired.current === target) return;
    fired.current = target;
    void onZero();
  }, [remainingMs, target, onZero]);

  if (!label || !target) return null;

  const secs = remainingMs === null ? null : Math.max(0, Math.floor(remainingMs / 1000));
  const text = secs === null ? "––:––:––" : secs >= 86400
    ? `${Math.floor(secs / 86400)} kun ${formatClock(secs % 86400)}`
    : formatClock(secs);

  if (running && secs !== null && data.tm.d > 0) {
    const frac = Math.min(1, secs / (data.tm.d * 60));
    const tone = frac > 0.25 ? "text-emerald-500" : frac > 0.1 ? "text-amber-500" : "text-destructive";
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-background py-1.5 pl-2 pr-4">
        <div className={cn("size-12", tone)}>
          <CircularProgressbar
            value={frac * 100}
            styles={buildStyles({ pathColor: "currentColor", trailColor: "rgba(128,128,128,0.2)", pathTransitionDuration: 0.3 })}
          />
        </div>
        <div className="leading-tight">
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className={cn("text-xl font-semibold tabular-nums", tone)}>{text}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background px-3.5 py-1.5 leading-tight">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{text}</div>
    </div>
  );
}

// =========================================================
// UMUMIY
// =========================================================
interface InfoRow { icon: React.ElementType; label: string; value: string }

function OverviewTab({ data }: { data: ContestFull }) {
  const isGym = data.k === "gym";
  const rows: InfoRow[] = [];
  if (!isGym && data.tm.st) rows.push({ icon: CalendarClock, label: "Boshlanishi", value: formatDateTime(data.tm.st) });
  if (!isGym && data.tm.et) rows.push({ icon: CalendarClock, label: "Tugashi", value: formatDateTime(data.tm.et) });
  if (!isGym && data.tm.rd) rows.push({ icon: CalendarClock, label: "Ro'yxat muddati", value: formatDateTime(data.tm.rd) });
  if (!isGym) rows.push({ icon: Timer, label: "Davomiyligi", value: formatDuration(data.tm.d) });
  if (data.cnt.p !== null) rows.push({ icon: ListChecks, label: "Masalalar", value: String(data.cnt.p) });
  rows.push({ icon: Users, label: "Ishtirokchilar", value: String(data.cnt.pc) });
  if (data.pt === "team" && data.team) {
    rows.push({
      icon: Users,
      label: "Jamoa hajmi",
      value: data.team.min === data.team.max ? `${data.team.min} kishi` : `${data.team.min}–${data.team.max} kishi`,
    });
  }
  if (!isGym) {
    rows.push({
      icon: Hourglass,
      label: "Qatnashish vaqti",
      value: isIndividual(data.pm) ? "Har kim «Boshlash» bosganda" : "Hamma bir vaqtda",
    });
  }

  return (
    <div className="space-y-6">
      {data.v?.u ? (
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <VideoPlayer src={data.v.u} poster={data.v.th ?? undefined} title={data.t} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {data.d ? (
            <article className="rounded-xl border bg-card p-5 sm:p-6">
              <MarkdownRenderer content={data.d} />
            </article>
          ) : (
            <EmptyState icon={Info} title="Tavsif qo'shilmagan" />
          )}

          {data.pz.length > 0 ? (
            <section className="rounded-xl border bg-card p-5" aria-label="Mukofotlar">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Trophy className="size-4 text-amber-500" /> Mukofotlar
              </h2>
              <ul className="space-y-2">
                {data.pz.map((p) => (
                  <li key={p.r} className="flex items-baseline gap-3 text-sm">
                    <span className="w-16 shrink-0 font-semibold tabular-nums">{p.r}-o'rin</span>
                    <span>{p.t}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border bg-card p-4" aria-label="Ma'lumotlar">
            <h2 className="mb-3 text-sm font-semibold">Ma'lumotlar</h2>
            <dl className="space-y-3">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium tabular-nums">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-4" aria-label="Musobaqa turi">
            <h2 className="mb-3 text-sm font-semibold">Musobaqa turi</h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{SCORING_LABEL[data.ct]}</Badge>
              {isGym ? (
                <Badge variant="secondary">Mashg'ulot</Badge>
              ) : (
                <Badge variant="secondary">{isIndividual(data.pm) ? "Individual vaqt" : "Umumiy vaqt"}</Badge>
              )}
              {data.pt === "team" ? <Badge variant="secondary">Jamoaviy</Badge> : null}
              {data.rt.ir ? <Badge variant="secondary">Reytingli</Badge> : null}
              {data.vis === "private" ? <Badge variant="secondary">Maxfiy</Badge> : null}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{SCORING_HINT[data.ct]}</p>
          </section>

          {data.lg.length > 0 ? (
            <section className="rounded-xl border bg-card p-4" aria-label="Tillar">
              <h2 className="mb-3 text-sm font-semibold">Ruxsat etilgan tillar</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.lg.map((l) => (
                  <Badge key={l.i} variant="outline" className="font-normal">{l.n}</Badge>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

// =========================================================
// MASALALAR
// =========================================================
function TaskStatus({ task, contestMode, icpc }: { task: ContestTask; contestMode: boolean; icpc: boolean }) {
  if (task.st) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
        {icpc && task.wa > 0 ? <span className="text-xs font-semibold">+{task.wa}</span> : null}
      </span>
    );
  }
  if (task.tr) {
    return (
      <span className="inline-flex items-center gap-1.5 text-destructive">
        <XCircle className="size-4" />
        {contestMode && task.wa > 0 ? <span className="text-xs font-semibold">−{task.wa}</span> : null}
      </span>
    );
  }
  return <CircleDashed className="size-4 text-muted-foreground/50" />;
}

function TasksTab({ data }: { data: ContestFull }) {
  const contestMode = data.m === "contest";

  if (!data.ta) {
    return <EmptyState icon={Lock} title="Masalalar hozircha yopiq" text={PHASE_INFO[data.ph].text} />;
  }
  if (data.ps.length === 0) {
    return <EmptyState icon={FileQuestion} title="Masalalar hali qo'shilmagan" />;
  }

  const total = data.ps.length;
  const solved = data.ps.filter((t) => t.st).length;
  const pct = Math.round((solved * 100) / total);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={solved}
          aria-label="Yechilgan masalalar"
        >
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">{solved} / {total} yechilgan</span>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Nomi</TableHead>
              <TableHead className="hidden w-28 sm:table-cell">Turi</TableHead>
              <TableHead className="w-24">Holat</TableHead>
              <TableHead className="w-28 text-right">Ball</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.ps.map((task) => (
              <TableRow key={task.id} className={cn(task.st && "bg-emerald-500/[0.04]")}>
                <TableCell className="font-semibold">{task.l}</TableCell>
                <TableCell>
                  <Link href={`/contests/${data.s}/tasks/${task.l}`} className="font-medium hover:underline">
                    {task.t}
                  </Link>
                  {task.k === "t" && task.cl ? (
                    <span className="ml-2 text-xs text-muted-foreground">javob berilgan</span>
                  ) : null}
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    {task.k === "p" ? <Code2 className="size-3.5" /> : <FileQuestion className="size-3.5" />}
                    {task.k === "p" ? "Masala" : "Test"}
                  </span>
                </TableCell>
                <TableCell>
                  <TaskStatus task={task} contestMode={contestMode} icpc={data.ct === "icpc"} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {contestMode ? (
                    <>
                      <span className="font-semibold">{formatScore(task.us)}</span>
                      <span className="text-muted-foreground"> / {formatScore(task.s)}</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">{formatScore(task.s)}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
