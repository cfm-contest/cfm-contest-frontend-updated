"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamBlock, TeamOption, TeamWhy } from "@/lib/api/contests/contest-actions";

export interface TeamRegisterPayload {
  team_id: string; // Team.id = UUID
  member_ids: number[];
  key?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamBlock | null;
  needKey: boolean;
  busy: boolean;
  onSubmit: (payload: TeamRegisterPayload) => void;
}

const WHY_TEXT: Record<TeamWhy, string> = {
  already_registered: "Jamoa allaqachon ro'yxatdan o'tgan",
  captain_busy: "Siz bu musobaqada boshqa joyda qatnashyapsiz",
  too_small: "Bo'sh a'zolar yetarli emas",
};

/** Boshlang'ich tanlov: kapitan + band bo'lmagan a'zolar, max gacha */
function defaultPick(t: TeamOption, max: number): Set<number> {
  const free = t.members.filter((m) => !m.busy);
  const captain = free.filter((m) => m.c);
  const rest = free.filter((m) => !m.c);
  return new Set([...captain, ...rest].slice(0, max).map((m) => m.i));
}

export function TeamRegisterDialog({ open, onOpenChange, team, needKey, busy, onSubmit }: Props) {
  const teams = team?.teams ?? [];
  const min = team?.min ?? 1;
  const max = team?.max ?? 1;
  const range = min === max ? `${min}` : `${min}–${max}`;

  const [teamId, setTeamId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [key, setKey] = useState("");

  const choose = (t: TeamOption) => {
    setTeamId(t.i);
    setPicked(defaultPick(t, max));
  };

  useEffect(() => {
    if (!open || teamId !== null) return;
    const first = teams.find((t) => t.ok);
    if (first) choose(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teams.length]);

  const current = teams.find((t) => t.i === teamId) ?? null;
  const count = picked.size;
  const sizeOk = current ? count >= min && count <= max : false;
  const keyOk = !needKey || key.trim().length > 0;

  const toggle = (id: number) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Jamoa bilan ro'yxatdan o'tish</DialogTitle>
          <DialogDescription>
            Qaysi jamoa nomidan qatnashishni tanlang. Qatnashadigan a'zolar soni {range} bo'lishi kerak.
          </DialogDescription>
        </DialogHeader>

        {teams.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-8 text-center">
            <Users className="mb-2 size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">Siz egasi bo'lgan jamoa topilmadi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Faqat jamoa egasi (kapitan) ro'yxatdan o'tkaza oladi. Avval jamoa yarating.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/teams">Jamoalarim</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2" role="radiogroup" aria-label="Jamoa">
              {teams.map((t) => {
                const active = t.i === teamId;
                return (
                  <button
                    key={t.i}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!t.ok}
                    onClick={() => choose(t)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/5" : t.ok ? "hover:bg-muted/50" : "opacity-60",
                      !t.ok && "cursor-not-allowed",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.n}</span>
                      {!t.ok && t.why ? (
                        <span className="block text-xs text-destructive">{WHY_TEXT[t.why]}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted-foreground">
                      {t.free}/{t.size} bo'sh
                      {active ? <Check className="size-4 text-primary" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            {current ? (
              <fieldset className="space-y-1">
                <legend className="mb-1 text-sm font-medium">
                  Qatnashadigan a'zolar{" "}
                  <span className={cn("font-normal tabular-nums", sizeOk ? "text-muted-foreground" : "text-destructive")}>
                    ({count}/{range})
                  </span>
                </legend>
                {current.members.map((m) => (
                  <label
                    key={m.i}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                      m.busy || m.c ? "opacity-70" : "cursor-pointer hover:bg-muted/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={picked.has(m.i)}
                      disabled={m.busy || m.c}
                      onChange={() => toggle(m.i)}
                    />
                    <span className="font-medium">{m.fn || m.u || `#${m.i}`}</span>
                    {m.u ? <span className="text-xs text-muted-foreground">@{m.u}</span> : null}
                    {m.c ? <span className="ml-auto text-xs text-muted-foreground">kapitan</span> : null}
                    {m.busy && !m.c ? <span className="ml-auto text-xs text-destructive">band</span> : null}
                  </label>
                ))}
                {!sizeOk ? (
                  <p className="pt-1 text-xs text-destructive">A'zolar soni {range} oralig'ida bo'lishi kerak.</p>
                ) : null}
              </fieldset>
            ) : (
              <p className="text-sm text-muted-foreground">Mos jamoani tanlang.</p>
            )}

            {needKey ? (
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                name="contest-access-key"
                placeholder="Kirish kaliti"
                autoComplete="new-password"
                aria-label="Kirish kaliti"
              />
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          <Button
            disabled={busy || !current || !sizeOk || !keyOk}
            onClick={() =>
              current &&
              onSubmit({
                team_id: current.i,
                member_ids: Array.from(picked),
                key: needKey ? key.trim() : undefined,
              })
            }
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Ro'yxatdan o'tish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
