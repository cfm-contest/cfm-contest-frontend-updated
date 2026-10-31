"use client";

import { LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "./confirm-action";
import { InviteMemberDialog } from "./invite-member-dialog";
import { JoinButton } from "./join-button";
import { TeamFormDialog } from "./team-form-dialog";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import type { TeamDetail } from "@/lib/teams/types";

/** Barcha ruxsatlar backend flag'lariga (can_*) tayanadi, rol matniga emas. */
export function TeamActions({ team }: { team: TeamDetail }) {
  const { run, pending } = useAction();
  const isPending = team.my_status === "pending";

  return (
    <div className="flex flex-wrap gap-2">
      {(team.can_join || isPending) && (
        <JoinButton teamId={team.id} isPublic={team.is_public} initialPending={isPending} />
      )}

      {team.can_invite && <InviteMemberDialog teamId={team.id} />}
      {team.can_manage && <TeamFormDialog team={team} />}

      {team.can_leave && (
        <ConfirmAction
          title="Jamoani tark etasizmi?"
          description="Qayta qo'shilish uchun yangi taklif yoki so'rov kerak bo'lishi mumkin."
          confirmLabel="Tark etish"
          onConfirm={() =>
            run(() => api(`/api/teams/${team.id}/leave`, json("DELETE")), { redirectTo: "/teams" })
          }
          trigger={
            <Button variant="outline" size="sm" disabled={pending}>
              <LogOut /> Tark etish
            </Button>
          }
        />
      )}

      {team.can_delete && (
        <ConfirmAction
          title={`"${team.name}" o'chirilsinmi?`}
          description="Jamoa va uning barcha a'zoliklari butunlay o'chiriladi. Contestlarda qatnashgan jamoani o'chirib bo'lmaydi. Bu amalni qaytarib bo'lmaydi."
          confirmLabel="O'chirish"
          onConfirm={() =>
            run(() => api(`/api/teams/${team.id}`, json("DELETE")), { redirectTo: "/teams" })
          }
          trigger={
            <Button variant="destructive" size="sm" disabled={pending}>
              <Trash2 /> O'chirish
            </Button>
          }
        />
      )}
    </div>
  );
}
