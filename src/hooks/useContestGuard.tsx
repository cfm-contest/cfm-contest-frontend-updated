"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { sendIntegrity, type IntegrityDelta } from "@/lib/api/contests/contest-actions";

// =========================================================
// 1) SAYT ICHIDAGI CHIQISH — faqat ogohlantiradi, backendga YOZILMAYDI
//    (Next.js App Router'da useBlocker yo'q: <a> bosilishi capture bosqichida ushlanadi)
// =========================================================
export function useLeaveGuard(slug: string, active: boolean) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const scope = `/contests/${slug}`;
    const inScope = (p: string) => p === scope || p.startsWith(`${scope}/`);

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || inScope(url.pathname)) return; // tashqi: beforeunload
      e.preventDefault();
      e.stopPropagation();
      setPending(url.pathname + url.search + url.hash);
    };

    // F5 / tabni yopish / tashqi havola
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [slug, active]);

  const stay = useCallback(() => setPending(null), []);
  const leave = useCallback(() => {
    if (!pending) return;
    const to = pending;
    setPending(null);
    router.push(to); // programmatik o'tish guard'dan o'tib ketadi
  }, [pending, router]);

  return { pending, stay, leave };
}

// =========================================================
// 2) TAB / COPY / PASTE — backendga YIG'INDI (delta) sifatida yoziladi
//    Native Page Visibility API: react-page-visibility kerak emas (u eski va baribir shuni o'raydi).
// =========================================================
const FLUSH_MS = 30_000;

export function useIntegrityTracker(slug: string, active: boolean) {
  const acc = useRef<Required<IntegrityDelta>>({ tab_switches: 0, away_seconds: 0, copies: 0, pastes: 0 });

  useEffect(() => {
    if (!active) return;
    let hiddenAt: number | null = null;
    let lastToast = 0;

    const dirty = () => Object.values(acc.current).some((v) => v > 0);
    const reset = () => (acc.current = { tab_switches: 0, away_seconds: 0, copies: 0, pastes: 0 });

    const flush = (beacon = false) => {
      if (!dirty()) return;
      const delta = acc.current;
      reset();
      if (beacon) {
        void sendIntegrity(slug, delta, true);
        return;
      }
      sendIntegrity(slug, delta).catch(() => {
        // yuborilmadi: keyingi flush'da qayta uriniladi
        for (const k of Object.keys(delta) as (keyof IntegrityDelta)[]) acc.current[k] += delta[k] ?? 0;
      });
    };

    const warn = (text: string) => {
      const now = Date.now();
      if (now - lastToast < 10_000) return;
      lastToast = now;
      toast.warning(text);
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        acc.current.tab_switches += 1;
        flush(true);
      } else if (hiddenAt !== null) {
        acc.current.away_seconds += Math.round((Date.now() - hiddenAt) / 1000);
        hiddenAt = null;
        warn("Boshqa oynaga o'tganingiz qayd etildi.");
        flush();
      }
    };
    const onCopy = () => {
      acc.current.copies += 1;
      warn("Nusxa ko'chirish qayd etildi.");
    };
    const onPaste = () => {
      acc.current.pastes += 1;
      warn("Joylashtirish (paste) qayd etildi.");
    };
    const onPageHide = () => flush(true);

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    window.addEventListener("pagehide", onPageHide);
    const timer = setInterval(() => flush(), FLUSH_MS);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
      window.removeEventListener("pagehide", onPageHide);
      flush(true);
    };
  }, [slug, active]);
}
