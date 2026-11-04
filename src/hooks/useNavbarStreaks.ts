"use client";

import { backendRequest } from "@/lib/api/django/backend";
import { useCallback, useEffect, useRef, useState } from "react";

// --------------------------------------------------
// API RESPONSE
// --------------------------------------------------

type RawResponse = {
  s: [number, number, boolean];
  xp: [number, number, string, string, number, number];
};

// --------------------------------------------------
// FRONTEND DATA
// --------------------------------------------------

export type NavbarStreaks = {
  streak: {
    current: number;
    longest: number;
    doneToday: boolean;
  };

  xp: {
    total: number;
    today: number;
    levelCode: string;
    levelLabel: string;
    toNext: number;
    progress: number;
  };
};

// --------------------------------------------------
// PARSER
// --------------------------------------------------

function parse(raw: RawResponse): NavbarStreaks {
  const [
    current,
    longest,
    doneToday,
  ] = raw.s;

  const [
    total,
    today,
    levelCode,
    levelLabel,
    toNext,
    progress,
  ] = raw.xp;

  return {
    streak: {
      current,
      longest,
      doneToday,
    },

    xp: {
      total,
      today,
      levelCode,
      levelLabel,
      toNext,
      progress: Math.min(
        100,
        Math.max(0, Number(progress) || 0)
      ),
    },
  };
}

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const STALE_MS = 60_000;

const API_URL = "/api/user/navbar/streaks/";

// --------------------------------------------------
// HOOK
// --------------------------------------------------

export function useNavbarStreaks(enabled: boolean) {
  const [data, setData] = useState<NavbarStreaks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const lastFetch = useRef(0);
  const inFlight = useRef<AbortController | null>(null);

  // --------------------------------------------------
  // FETCH
  // --------------------------------------------------

  const load = useCallback(async (force = false) => {
    if (!enabled) return;

    if (
      !force &&
      Date.now() - lastFetch.current < STALE_MS
    ) {
      return;
    }

    inFlight.current?.abort();

    const ctrl = new AbortController();
    inFlight.current = ctrl;

    setLoading(true);

    try {
      const res = await backendRequest(API_URL, {
        signal: ctrl.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const raw = (await res.json()) as RawResponse;

      const parsed = parse(raw);

      if (ctrl.signal.aborted) return;

      setData(parsed);
      setError(false);

      lastFetch.current = Date.now();
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(true);
      }
    } finally {
      if (inFlight.current === ctrl) {
        inFlight.current = null;
        setLoading(false);
      }
    }
  }, [enabled]);

  // --------------------------------------------------
  // AUTH STATE
  // --------------------------------------------------

  useEffect(() => {
    if (!enabled) {
      inFlight.current?.abort();
      inFlight.current = null;

      setData(null);
      setLoading(false);
      setError(false);

      lastFetch.current = 0;

      return;
    }

    load(true);

    return () => {
      inFlight.current?.abort();
    };
  }, [enabled, load]);

  // --------------------------------------------------
  // TAB FOCUS / VISIBILITY
  // --------------------------------------------------

  useEffect(() => {
    if (!enabled) return;

    const onFocus = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };

    window.addEventListener("focus", onFocus);

    document.addEventListener(
      "visibilitychange",
      onFocus
    );

    return () => {
      window.removeEventListener("focus", onFocus);

      document.removeEventListener(
        "visibilitychange",
        onFocus
      );
    };
  }, [enabled, load]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const refresh = useCallback(() => {
    return load(true);
  }, [load]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}
