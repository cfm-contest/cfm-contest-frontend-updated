// components/layout/StreakIcons.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  CSS (keyframes). Navbar ichida bir marta <StreakAnimStyles /> render qiling */
/* -------------------------------------------------------------------------- */

const CSS = `
/* Olov: yonib, tebranib turadi */
@keyframes sx-flicker {
  0%, 100% { transform: scale(1, 1) rotate(0deg);        filter: drop-shadow(0 0 2px rgba(249,115,22,.55)) brightness(1); }
  18%      { transform: scale(1.08, 1.16) rotate(-4deg); filter: drop-shadow(0 0 6px rgba(249,115,22,.9))  brightness(1.12); }
  36%      { transform: scale(.95, 1.03) rotate(3deg);   filter: drop-shadow(0 0 3px rgba(249,115,22,.6))  brightness(1); }
  58%      { transform: scale(1.06, 1.2) rotate(-2deg);  filter: drop-shadow(0 0 7px rgba(251,146,60,.95)) brightness(1.18); }
  80%      { transform: scale(1.02, .97) rotate(4deg);   filter: drop-shadow(0 0 3px rgba(249,115,22,.6))  brightness(1.03); }
}
.sx-flame-lit { transform-origin: 50% 90%; animation: sx-flicker 1.35s ease-in-out infinite; }

/* Streak xavf ostida: cho'g' kabi pulsatsiya */
@keyframes sx-ember { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
.sx-flame-dim { animation: sx-ember 2.2s ease-in-out infinite; }

/* Chaqmoq: har ~3 soniyada ikki marta yarq etadi */
@keyframes sx-bolt-idle {
  0%, 84%, 100% { transform: scale(1) rotate(0);       filter: drop-shadow(0 0 0 rgba(251,191,36,0)); }
  86%           { transform: scale(1.28) rotate(-9deg); filter: drop-shadow(0 0 7px rgba(251,191,36,1)) brightness(1.35); }
  88%           { transform: scale(1) rotate(0);       filter: brightness(.95); }
  91%           { transform: scale(1.22) rotate(7deg);  filter: drop-shadow(0 0 6px rgba(251,191,36,.95)) brightness(1.3); }
  94%           { transform: scale(1) rotate(0);       filter: drop-shadow(0 0 0 rgba(251,191,36,0)); }
}
.sx-bolt { animation: sx-bolt-idle 3.2s linear infinite; }

/* Streak oshganda: olov "portlaydi" */
@keyframes sx-burst {
  0%   { transform: scale(1) rotate(0); }
  22%  { transform: scale(1.75) rotate(-14deg); filter: drop-shadow(0 0 10px #f97316) brightness(1.3); }
  48%  { transform: scale(.9) rotate(9deg); }
  72%  { transform: scale(1.3) rotate(-5deg); filter: drop-shadow(0 0 6px #fb923c); }
  100% { transform: scale(1) rotate(0); }
}
.sx-burst { transform-origin: 50% 90%; animation: sx-burst .95s cubic-bezier(.2,.8,.2,1) 1; }

/* XP oshganda: chaqmoq zaryadlanadi */
@keyframes sx-charge {
  0%   { transform: scale(1) rotate(0); }
  14%  { transform: scale(1.85) rotate(-16deg); filter: drop-shadow(0 0 12px #fbbf24) brightness(1.6); }
  30%  { transform: scale(1.05) rotate(10deg); filter: brightness(1); }
  46%  { transform: scale(1.6) rotate(-10deg);  filter: drop-shadow(0 0 10px #fbbf24) brightness(1.5); }
  62%  { transform: scale(1) rotate(4deg); }
  100% { transform: scale(1) rotate(0); }
}
.sx-charge { animation: sx-charge 1s cubic-bezier(.2,.8,.2,1) 1; }

/* Ikonka orqasida kengayuvchi halqa */
@keyframes sx-ring { 0% { transform: scale(.5); opacity: .75; } 100% { transform: scale(2.4); opacity: 0; } }
.sx-ring { animation: sx-ring .9s ease-out 1 forwards; }

/* "+N" tepaga uchib chiqadi */
@keyframes sx-rise {
  0%   { transform: translateY(2px) scale(.8); opacity: 0; }
  15%  { transform: translateY(-4px) scale(1.1); opacity: 1; }
  100% { transform: translateY(-22px) scale(1); opacity: 0; }
}
.sx-rise { animation: sx-rise 1.1s ease-out 1 forwards; }

/* Raqam "pop" qiladi */
@keyframes sx-num { 0% { transform: scale(1); } 35% { transform: scale(1.3); } 100% { transform: scale(1); } }
.sx-num { display: inline-block; animation: sx-num .6s ease-out 1; }

@media (prefers-reduced-motion: reduce) {
  .sx-flame-lit, .sx-flame-dim, .sx-bolt, .sx-burst, .sx-charge,
  .sx-ring, .sx-rise, .sx-num { animation: none !important; }
}
`;

export function StreakAnimStyles() {
  return <style>{CSS}</style>;
}

/* -------------------------------------------------------------------------- */
/*  Hooklar                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Qiymat OSHGANINI aniqlaydi (birinchi yuklanishda emas, faqat keyingi
 * o'zgarishlarda). `active` ~1.1s true bo'lib turadi, `key` har safar o'zgaradi.
 */
export function useIncrease(value: number | undefined, ms = 1100) {
  const prev = useRef<number | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState({ active: false, delta: 0, key: 0 });

  useEffect(() => {
    if (value === undefined) {
      prev.current = undefined; // logout / qayta yuklash
      return;
    }
    const before = prev.current;
    prev.current = value;
    if (before === undefined || value <= before) return;

    setState((s) => ({ active: true, delta: value - before, key: s.key + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setState((s) => ({ ...s, active: false })),
      ms
    );
  }, [value, ms]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return state;
}

/** Raqamni silliq sanab o'zgartiradi (ease-out). */
function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === target) {
      from.current = target;
      setDisplay(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(begin + (target - begin) * eased);
      from.current = v;
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/* -------------------------------------------------------------------------- */
/*  Komponentlar                                                              */
/* -------------------------------------------------------------------------- */

export type FlameState = "lit" | "risk" | "off";

/** "+N" yozuvi ikonka tepasiga uchib chiqadi. */
export function FloatingGain({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2">
      <span
        className={cn(
          "sx-rise block whitespace-nowrap text-[11px] font-bold tabular-nums",
          className
        )}
      >
        {text}
      </span>
    </span>
  );
}

export function AnimatedFlame({
  state,
  burst = false,
  burstKey = 0,
  className,
}: {
  state: FlameState;
  burst?: boolean;
  burstKey?: number;
  className?: string;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {burst && (
        <span
          key={`ring-${burstKey}`}
          aria-hidden
          className="sx-ring absolute inset-0 rounded-full bg-orange-400/40"
        />
      )}
      <Flame
        key={burst ? `b-${burstKey}` : "idle"}
        strokeWidth={1.75}
        className={cn(
          "relative",
          state === "lit" && "fill-orange-500 text-orange-500",
          state === "risk" && "fill-orange-200 text-orange-400",
          state === "off" && "text-slate-400",
          burst
            ? "sx-burst"
            : state === "lit"
            ? "sx-flame-lit"
            : state === "risk"
            ? "sx-flame-dim"
            : "",
          className
        )}
      />
    </span>
  );
}

export function AnimatedBolt({
  burst = false,
  burstKey = 0,
  className,
}: {
  burst?: boolean;
  burstKey?: number;
  className?: string;
}) {
  return (
    <span className="relative inline-flex items-center justify-center">
      {burst && (
        <span
          key={`ring-${burstKey}`}
          aria-hidden
          className="sx-ring absolute inset-0 rounded-full bg-amber-300/50"
        />
      )}
      <Zap
        key={burst ? `b-${burstKey}` : "idle"}
        strokeWidth={1.75}
        className={cn(
          "relative fill-amber-400 text-amber-500",
          burst ? "sx-charge" : "sx-bolt",
          className
        )}
      />
    </span>
  );
}

/** Raqam: o'zgarganda sanab boradi, oshganda "pop" qiladi. */
export function AnimatedNumber({
  value,
  pop = false,
  popKey = 0,
  locale = "uz-UZ",
}: {
  value: number;
  pop?: boolean;
  popKey?: number;
  locale?: string;
}) {
  const shown = useCountUp(value);
  return (
    <span
      key={pop ? `n-${popKey}` : "n"}
      className={cn("tabular-nums", pop && "sx-num")}
    >
      {shown.toLocaleString(locale)}
    </span>
  );
}
