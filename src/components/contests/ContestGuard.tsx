"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useIntegrityTracker, useLeaveGuard } from "@/hooks/useContestGuard";

/**
 * Contest detail VA tasks/[alfa] sahifalarida bir marta o'rnating:
 *   <ContestGuard slug={slug} active={running} />
 * active = foydalanuvchi hozir contest rejimida (phase === "running").
 */
export function ContestGuard({ slug, active }: { slug: string; active: boolean }) {
  const { pending, stay, leave } = useLeaveGuard(slug, active);
  useIntegrityTracker(slug, active);

  return (
    <AlertDialog open={pending !== null} onOpenChange={(o) => !o && stay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Musobaqadan chiqmoqchimisiz?</AlertDialogTitle>
          <AlertDialogDescription>
            Musobaqa davom etmoqda va vaqtingiz ketayapti. Yechimingizni yuborib bo'lgan bo'lsangiz ham,
            musobaqa sahifasiga qaytishni unutmang.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Musobaqaga qaytish</AlertDialogCancel>
          <AlertDialogAction onClick={leave}>Baribir chiqish</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
