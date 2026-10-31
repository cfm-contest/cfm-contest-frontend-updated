"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "./confirm-action";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import { fmtDate, initials } from "@/lib/teams/utils";
import type { SentInvitation } from "@/lib/teams/types";

export function SentInvitations({ items }: { items: SentInvitation[] }) {
  const { run, pending } = useAction();

  if (items.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Kutilayotgan takliflar yo'q. "A'zo qo'shish" tugmasi orqali yangi odamni taklif qiling.
      </p>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((inv) => {
        const u = inv.invited_user;
        const name = u.full_name || u.username || String(u.telegram_id);

        return (
          <li key={inv.id} className="flex items-center gap-3 py-3">
            <Avatar>
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {inv.invited_by} taklif qildi · {fmtDate(inv.created_at)}
                {inv.expires_at && ` · ${fmtDate(inv.expires_at)} gacha`}
              </p>
            </div>

            <ConfirmAction
              title="Taklif bekor qilinsinmi?"
              description={`${name} ga yuborilgan taklif bekor qilinadi.`}
              confirmLabel="Bekor qilish"
              onConfirm={() =>
                run(() => api(`/api/teams/invitations/${inv.id}`, json("DELETE")), {
                  success: "Taklif bekor qilindi",
                })
              }
              trigger={
                <Button variant="ghost" size="sm" disabled={pending}>
                  Bekor qilish
                </Button>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
