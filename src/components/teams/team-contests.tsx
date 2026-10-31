import Link from "next/link";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContestStatus, RegistrationStatus, TeamContestRow } from "@/lib/teams/types";
import { fmtDate } from "@/lib/teams/utils";

const TYPE_LABEL: Record<TeamContestRow["contest"]["contest_type"], string> = {
  icpc: "ICPC",
  dynamic: "Dinamik",
  simple: "Oddiy",
};

const REG_NOTE: Partial<Record<RegistrationStatus, string>> = {
  expired: "Qatnashmagan",
  disqualified: "Diskvalifikatsiya",
};

const formatScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function RankMark({ rank }: { rank: number | null }) {
  const base =
    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums";

  if (rank === null) return <div className={cn(base, "border border-dashed text-muted-foreground")}>—</div>;
  if (rank === 1) return <div className={cn(base, "bg-foreground text-background")}>{rank}</div>;
  if (rank === 2) return <div className={cn(base, "border-2 border-foreground")}>{rank}</div>;
  if (rank === 3) return <div className={cn(base, "border border-foreground/40")}>{rank}</div>;
  return <div className={cn(base, "bg-muted text-foreground")}>{rank}</div>;
}

function StatusChip({ status }: { status: ContestStatus }) {
  if (status === "ongoing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-background/70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-background" />
        </span>
        Jarayonda
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <Badge variant="outline" className="rounded-full text-[11px] font-medium">
        Kutilmoqda
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="rounded-full text-[11px] font-medium text-muted-foreground">
      Yakunlangan
    </Badge>
  );
}

function Stat({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{children}</div>
    </div>
  );
}

type Row = TeamContestRow & { team?: { id: string; name: string } };

type Props = {
  rows: Row[];
  /** true bo'lsa har qatorda jamoa nomi ko'rsatiladi (/teams — "Contestlarim"). */
  showTeam?: boolean;
  emptyText?: string;
};

export function TeamContests({
  rows,
  showTeam = false,
  emptyText = "Jamoa hali birorta contestda qatnashmagan.",
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-dashed">
          <Trophy className="size-5 text-muted-foreground" />
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="-mx-2 divide-y sm:-mx-3">
      {rows.map((r) => {
        const note = REG_NOTE[r.status];
        const pct = r.problems_count > 0 ? Math.round((r.solved_count / r.problems_count) * 100) : 0;

        return (
          <li key={r.registration_id}>
            <Link
              href={`/contests/${r.contest.slug}`}
              className="group grid gap-4 rounded-xl px-2 py-4 transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-8 sm:px-3"
            >
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <RankMark rank={r.rank} />

                <div className="min-w-0 space-y-1.5">
                  <p className="truncate text-sm font-semibold leading-tight group-hover:underline sm:text-base">
                    {r.contest.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <StatusChip status={r.contest.status} />
                    <span>{r.contest.kind === "gym" ? "Mashq" : TYPE_LABEL[r.contest.contest_type]}</span>
                    {r.contest.start_time && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{fmtDate(r.contest.start_time)}</span>
                      </>
                    )}
                    {showTeam && r.team && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-medium text-foreground">{r.team.name}</span>
                      </>
                    )}
                    {note && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-medium text-destructive">{note}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-3 sm:w-[19rem] sm:grid-cols-[3.5rem_4.5rem_minmax(0,1fr)] sm:border-0 sm:pt-0">
                <Stat label="O'rin">{r.rank ?? "—"}</Stat>
                <Stat label="Ball">{formatScore(r.score)}</Stat>
                <Stat label="Yechilgan">
                  <div className="flex items-center gap-2">
                    <span>
                      {r.solved_count}/{r.problems_count}
                    </span>
                    <div className="hidden h-1 flex-1 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
                      <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Stat>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
