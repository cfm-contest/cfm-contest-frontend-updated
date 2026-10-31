"use client";

import { backendRequest } from "@/lib/api/django/backend";
import { useCallback, useEffect, useRef, useState } from "react";

type RawResponse = {
  s: [number, number, boolean, number];
  xp: [number, number, string, string, number, number];
};

export type NavbarStreaks = {
  streak: {
    current: number;
    longest: number;
    doneToday: boolean;
    freezes: number;
  };
  xp: {
    total: number;
    today: number;
    levelCode: string;
    levelLabel: string;
    toNext: number;
    progress: number; // 0..100
  };
};

function parse(raw: RawResponse): NavbarStreaks {
  const [current, longest, doneToday, freezes] = raw.s;
  const [total, today, levelCode, levelLabel, toNext, progress] = raw.xp;
  return {
    streak: { current, longest, doneToday, freezes },
    xp: {
      total,
      today,
      levelCode,
      levelLabel,
      toNext,
      progress: Math.min(100, Math.max(0, progress ?? 0)),
    },
  };
}

const STALE_MS = 60_000;

export function useNavbarStreaks(enabled: boolean) {
  const [data, setData] = useState<NavbarStreaks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastFetch = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force && Date.now() - lastFetch.current < STALE_MS) return;
    inFlight.current?.abort();
    const ctrl = new AbortController();
    inFlight.current = ctrl;

    setLoading(true);
    try {
      const res = await backendRequest("/api/user/navbar/streaks", {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      setData(parse(await res.json()));
      setError(false);
      lastFetch.current = Date.now();
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(true);
    } finally {
      if (inFlight.current === ctrl) setLoading(false);
    }
  }, []);

  // auth bo'lganda yuklash, chiqqanda tozalash
  useEffect(() => {
    if (!enabled) {
      inFlight.current?.abort();
      setData(null);
      setError(false);
      lastFetch.current = 0;
      return;
    }
    load(true);
    return () => inFlight.current?.abort();
  }, [enabled, load]);

  // tab'ga qaytganda yangilash
  useEffect(() => {
    if (!enabled) return;
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [enabled, load]);

  return { data, loading, error, refresh: () => load(true) };
}
