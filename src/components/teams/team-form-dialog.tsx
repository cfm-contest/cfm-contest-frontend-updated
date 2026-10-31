"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/teams/client";
import { useAction } from "@/lib/teams/use-action";
import type { TeamDetail } from "@/lib/teams/types";

type Props = {
  team?: Pick<TeamDetail, "id" | "name" | "description" | "is_public">;
};

export function TeamFormDialog({ team }: Props) {
  const editing = !!team;
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(team?.is_public ?? true);
  const { run, pending } = useAction();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const avatar = fd.get("avatar");
    if (avatar instanceof File && avatar.size === 0) fd.delete("avatar");
    fd.set("is_public", String(isPublic));

    run(
      () =>
        api(editing ? `/api/teams/${team!.id}` : "/api/teams/create", {
          method: editing ? "PATCH" : "POST",
          body: fd,
        }),
      {
        success: editing ? "Jamoa yangilandi" : "Jamoa yaratildi",
        redirectTo: editing ? undefined : (res) => `/teams/${res.team.id}`,
        onDone: () => setOpen(false),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="sm" className="rounded-xl gap-2 font-medium">
            <Pencil className="size-4" /> Tahrirlash
          </Button>
        ) : (
          <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20 font-semibold">
            <Plus className="size-4" /> Yangi jamoa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg rounded-3xl p-6 border-border/80 shadow-2xl backdrop-blur-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold">{editing ? "Jamoani tahrirlash" : "Yangi jamoa yaratish"}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {editing ? "Jamoa ma'lumotlarini o'zgartiring va saqlang." : "Jamoa nomi va tavsifini kiriting, ommaviyligini tanlang."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nomi</Label>
            <Input id="name" name="name" required maxLength={100} defaultValue={team?.name} className="rounded-xl h-11" placeholder="Jamoa nomi..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tavsif</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={team?.description} className="rounded-xl resize-none" placeholder="Jamoa haqida qisqacha..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avatar rasm</Label>
            <Input id="avatar" name="avatar" type="file" accept="image/*" className="rounded-xl file:text-primary file:font-medium cursor-pointer" />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_public" className="text-sm font-semibold">Ommaviy jamoa</Label>
              <p className="text-xs text-muted-foreground">
                {isPublic ? "Istalgan kishi to'g'ridan-to'g'ri qo'shila oladi" : "Faqat so'rov yuborish orqali qo'shilish mumkin"}
              </p>
            </div>
            <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto rounded-xl h-11 px-6 font-semibold shadow-md">
              {pending ? "Saqlanmoqda..." : editing ? "O'zgarishlarni saqlash" : "Jamoani yaratish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
