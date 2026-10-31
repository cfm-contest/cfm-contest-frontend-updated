"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Fireworks } from "fireworks-js";
import type { RankLevel } from "../types";

const HUE: Partial<Record<RankLevel, { min: number; max: number }>> = {
  grandmaster: { min: 0, max: 22 },
  immortal: { min: 10, max: 50 },
};

interface Props {
  rank: RankLevel;
  onDone: () => void;
  duration?: number;
}

/** fireworks-js: butun ekran fireworks (faqat grandmaster va immortal) */
export default function FireworksOverlay({ rank, onDone, duration = 3400 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let fw: Fireworks | null = null;
    let cancelled = false;
    const immortal = rank === "immortal";

    (async () => {
      const { Fireworks } = await import("fireworks-js");
      if (cancelled || !ref.current) return;
      fw = new Fireworks(ref.current, {
        autoresize: true,
        opacity: 0.55,
        acceleration: 1.05,
        friction: 0.97,
        gravity: 1.5,
        particles: immortal ? 80 : 55,
        explosion: immortal ? 7 : 5,
        intensity: immortal ? 38 : 28,
        traceLength: 3,
        traceSpeed: 10,
        flickering: 50,
        lineStyle: "round",
        hue: HUE[rank] ?? { min: 0, max: 360 },
        delay: { min: 18, max: 40 },
        rocketsPoint: { min: 25, max: 75 },
        lineWidth: { explosion: { min: 1, max: 3 }, trace: { min: 1, max: 2 } },
        brightness: { min: 50, max: 80 },
        decay: { min: 0.015, max: 0.03 },
        mouse: { click: false, move: false, max: 1 },
        sound: { enabled: false },
      });
      fw.start();
    })();

    const soften = window.setTimeout(() => fw?.waitStop(), duration - 700);
    const done = window.setTimeout(onDone, duration);

    return () => {
      cancelled = true;
      window.clearTimeout(soften);
      window.clearTimeout(done);
      fw?.stop(true);
    };
  }, [rank, duration, onDone]);

  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[9998] h-screen w-screen"
    />,
    document.body,
  );
}
