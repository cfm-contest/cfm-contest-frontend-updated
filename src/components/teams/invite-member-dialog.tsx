"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Search, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, json } from "@/lib/teams/client";
import { initials } from "@/lib/teams/utils";
import type { SearchUser } from "@/lib/teams/types";

export function InviteMemberDialog({ teamId }: { teamId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());

  const q = query.trim();

  // Debounce (300ms) + eski so'rovni bekor qilish
  useEffect(() => {
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const ctrl = new AbortController();
    setSearching(true);

    const t = setTimeout(async () => {
      try {
        const data = await api<{ results: SearchUser[] }>(
          `/api/teams/${teamId}/search-users?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        setResults(data.results ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") toast.error((e as Error).message);
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, teamId]);

  async function invite(user: Pick<SearchUser, "telegram_id">) {
    setBusyId(user.telegram_id);
    try {
      await api(`/api/teams/${teamId}/invitations`, json("POST", { telegram_id: user.telegram_id }));
      setSent((prev) => new Set(prev).add(user.telegram_id));
      toast.success("Taklif yuborildi");
      router.refresh(); // "Takliflar" tabini yangilaydi
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setSent(new Set());
    }
  }

  // Qidiruvda topilmasa ham, to'g'ridan-to'g'ri Telegram ID bilan taklif qilish mumkin.
  const showIdFallback = !searching && results.length === 0 && /^\d{5,}$/.test(q);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus /> A'zo qo'shish
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A'zo qo'shish</DialogTitle>
          <DialogDescription>Ism, username yoki Telegram ID bo'yicha qidiring va taklif yuboring.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qidirish..."
            className="pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-72 min-h-24 overflow-y-auto">
          {q.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Kamida 2 ta belgi kiriting.</p>
          ) : results.length === 0 && !searching && !showIdFallback ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Hech kim topilmadi.</p>
          ) : (
            <ul className="divide-y">
              {results.map((u) => {
                const name = u.full_name || u.username || String(u.telegram_id);
                const state = sent.has(u.telegram_id) ? "invited" : u.state ?? "available";

                return (
                  <li key={u.telegram_id} className="flex items-center gap-3 py-2.5">
                    <Avatar className="size-9">
                      <AvatarFallback>{initials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.username ? `@${u.username} · ` : ""}ID {u.telegram_id}
                      </p>
                    </div>

                    {state === "available" ? (
                      <Button size="sm" disabled={busyId === u.telegram_id} onClick={() => invite(u)}>
                        {busyId === u.telegram_id ? <Loader2 className="animate-spin" /> : "Taklif qilish"}
                      </Button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {state === "invited" && <Check className="size-3.5" />}
                        {state === "invited"
                          ? "Taklif yuborilgan"
                          : state === "requested"
                            ? "So'rov yuborgan"
                            : "A'zo"}
                      </span>
                    )}
                  </li>
                );
              })}

              {showIdFallback && (
                <li className="flex items-center justify-between gap-3 py-2.5">
                  <p className="text-sm text-muted-foreground">ID {q} bilan taklif yuborish</p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === Number(q)}
                    onClick={() => invite({ telegram_id: Number(q) })}
                  >
                    Taklif qilish
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
