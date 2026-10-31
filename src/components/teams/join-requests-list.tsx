"use client";

import { Check, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import { fmtDate, initials } from "@/lib/teams/utils";
import type { JoinRequest } from "@/lib/teams/types";

export function JoinRequestsList({ teamId, items }: { teamId: string; items: JoinRequest[] }) {
  const { run, pending } = useAction();

  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Qo'shilish so'rovlari yo'q.</p>;
  }

  const respond = (r: JoinRequest, action: "approve" | "reject") =>
    run(() => api(`/api/teams/${teamId}/join-requests/${r.telegram_id}/${action}`, json("POST")), {
      success: action === "approve" ? "So'rov qabul qilindi" : "So'rov rad etildi",
    });

  return (
    <ul className="divide-y">
      {items.map((r) => {
        const name = r.full_name || r.username || String(r.telegram_id);

        return (
          <li key={r.telegram_id} className="flex items-center gap-3 py-3">
            <Avatar>
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.username ? `@${r.username} · ` : ""}
                {fmtDate(r.requested_at)}
              </p>
            </div>

            <Button size="sm" disabled={pending} onClick={() => respond(r, "approve")}>
              <Check /> Qabul
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => respond(r, "reject")}>
              <X /> Rad
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
