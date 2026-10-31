"use client";

import { Crown, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmAction } from "./confirm-action";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import { initials } from "@/lib/teams/utils";
import type { Member } from "@/lib/teams/types";

type Props = {
  teamId: string;
  members: Member[];
  /** owner yoki admin (backend hisoblagan) */
  canManage: boolean;
  isOwner: boolean;
};

export function MembersList({ teamId, members, canManage, isOwner }: Props) {
  const { run, pending } = useAction();

  const changeRole = (telegramId: number, role: string) =>
    run(() => api(`/api/teams/${teamId}/members/${telegramId}`, json("PATCH", { role })), {
      success: "Rol yangilandi",
    });

  const remove = (telegramId: number) =>
    run(() => api(`/api/teams/${teamId}/members/${telegramId}`, json("DELETE")), {
      success: "A'zo jamoadan chiqarildi",
    });

  const transfer = (telegramId: number) =>
    run(() => api(`/api/teams/${teamId}/transfer-owner`, json("POST", { telegram_id: telegramId })), {
      success: "Egalik o'tkazildi",
    });

  return (
    <ul className="divide-y">
      {members.map((m) => {
        const name = m.full_name || m.username || String(m.telegram_id);
        // Backend: admin faqat oddiy a'zoni chiqara oladi, adminni faqat egasi.
        const canRemove = !m.is_owner && !m.is_me && canManage && (isOwner || !m.is_admin);
        const canTransfer = isOwner && !m.is_owner;

        return (
          <li key={m.user_id} className="flex items-center gap-3 py-3">
            <Avatar>
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {name}
                {m.is_me && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(siz)</span>}
              </p>
              {m.username && <p className="truncate text-xs text-muted-foreground">@{m.username}</p>}
            </div>

            {isOwner && !m.is_owner ? (
              <Select
                value={m.is_admin ? "admin" : "member"}
                onValueChange={(v) => changeRole(m.telegram_id, v)}
                disabled={pending}
              >
                <SelectTrigger className="h-8 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">A'zo</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={m.is_owner || m.is_admin ? "default" : "secondary"}>
                {m.is_owner ? "Egasi" : m.is_admin ? "Admin" : "A'zo"}
              </Badge>
            )}

            {canTransfer && (
              <ConfirmAction
                title={`Egalikni ${name} ga o'tkazasizmi?`}
                description="Siz admin bo'lib qolasiz va jamoani o'chirish hamda rollarni boshqarish huquqini yo'qotasiz. Buni faqat yangi ega qaytara oladi."
                confirmLabel="O'tkazish"
                onConfirm={() => transfer(m.telegram_id)}
                trigger={
                  <Button variant="ghost" size="icon" disabled={pending} aria-label="Egalikni o'tkazish">
                    <Crown className="size-4" />
                  </Button>
                }
              />
            )}

            {canRemove && (
              <ConfirmAction
                title={`${name} jamoadan chiqarilsinmi?`}
                description="A'zo jamoaga qayta qo'shilishi uchun yangi taklif yoki so'rov kerak bo'ladi."
                confirmLabel="Chiqarish"
                onConfirm={() => remove(m.telegram_id)}
                trigger={
                  <Button variant="ghost" size="icon" disabled={pending} aria-label="A'zoni chiqarish">
                    <UserMinus className="size-4" />
                  </Button>
                }
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
