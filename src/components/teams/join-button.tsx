"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, json } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";

type Props = {
  teamId: string;
  isPublic?: boolean;
  /** Server'dan: my_status === "pending" */
  initialPending?: boolean;
};

export function JoinButton({ teamId, isPublic = true, initialPending = false }: Props) {
  const { run, pending } = useAction();
  const [requested, setRequested] = useState(initialPending);

  // Yopiq jamoada so'rov yuborilgach: holat + bekor qilish imkoniyati.
  if (requested) {
    return (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" disabled>
          <Check /> So'rov yuborildi
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            run(
              async () => {
                const res = await api(`/api/teams/${teamId}/join`, json("DELETE"));
                setRequested(false);
                return res;
              },
              { success: "So'rov bekor qilindi" }
            )
          }
        >
          <X /> Bekor qilish
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        run(async () => {
          const res = await api(`/api/teams/${teamId}/join`, json("POST"));
          if (String(res?.status).toLowerCase() === "pending") setRequested(true);
          return res; // toast backend'dagi `message` ni ko'rsatadi
        })
      }
    >
      {pending ? "Yuborilmoqda..." : isPublic ? "Qo'shilish" : "So'rov yuborish"}
    </Button>
  );
}
