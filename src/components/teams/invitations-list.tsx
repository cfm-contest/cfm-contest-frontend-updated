"use client";

import { Check, X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import { fmtDate } from "@/lib/teams/utils";
import type { Invitation } from "@/lib/teams/types";

export function InvitationsList({ items }: { items: Invitation[] }) {
  const { run, pending } = useAction();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Mail className="size-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground font-medium">Hozircha sizga yuborilgan takliflar yo'q.</p>
      </div>
    );
  }

  const respond = (inv: Invitation, action: "accept" | "reject") =>
    run(() => api(`/api/teams/invitations/${inv.id}/${action}`, json("POST")), {
      redirectTo: action === "accept" ? `/teams/${inv.team_id}` : undefined,
    });

  return (
    <div className="space-y-3">
      {items.map((inv) => (
        <Card key={inv.id} className="rounded-2xl border-border/60 bg-card/80 shadow-sm transition-all hover:border-primary/30">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
            <div className="min-w-0 space-y-1">
              <p className="font-bold text-base text-foreground tracking-tight">{inv.team_name}</p>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-foreground/80">{inv.invited_by}</span> taklif qildi
                <span>·</span>
                <span>{fmtDate(inv.created_at)}</span>
                {inv.expires_at && (
                  <>
                    <span>·</span>
                    <span className="text-amber-500 font-medium">{fmtDate(inv.expires_at)} gacha</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                size="sm"
                disabled={pending}
                onClick={() => respond(inv, "accept")}
                className="rounded-xl gap-1.5 font-semibold shadow-sm"
              >
                <Check className="size-4" /> Qabul qilish
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => respond(inv, "reject")}
                className="rounded-xl gap-1.5 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60"
              >
                <X className="size-4" /> Rad etish
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
