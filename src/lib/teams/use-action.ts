"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Options = {
  success?: string;
  redirectTo?: string | ((res: any) => string);
  onDone?: () => void;
};

/** Mutatsiya + toast + router.refresh() ni bitta joyga yig'adi. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<any>, opts: Options = {}) =>
    start(async () => {
      try {
        const res = await fn();
        toast.success(opts.success ?? res?.message ?? "Bajarildi");
        opts.onDone?.();
        if (opts.redirectTo) {
          router.push(typeof opts.redirectTo === "function" ? opts.redirectTo(res) : opts.redirectTo);
        } else {
          router.refresh();
        }
      } catch (e) {
        toast.error((e as Error).message);
      }
    });

  return { run, pending };
}
