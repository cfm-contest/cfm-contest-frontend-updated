"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { RankLevel } from "../types";
import { RANK_CONFIG } from "../rank-config";
import { FRAME_EFFECTS, type ParticleKind } from "./frame-effects";

interface Particle {
  id: number;
  kind: ParticleKind;
  ang: number;
  dist: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
  dur: number;
}
interface Wave {
  ox: number;
  oy: number;
  particles: Particle[];
}
interface Burst {
  id: number;
  shocks: number;
  waves: Wave[];
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function makeBurst(rank: RankLevel, id: number, size: number): Burst {
  const fx = FRAME_EFFECTS[rank].burst;
  const cfg = RANK_CONFIG[rank];
  const colors = [cfg.primary, cfg.secondary, ...fx.accent];
  const k = Math.max(0.6, size / 120);
  const perWave = Math.ceil(fx.particles / fx.waves);

  const waves: Wave[] = Array.from({ length: fx.waves }, (_, w) => {
    const first = w === 0;
    const spread = first ? 1 : 0.7;
    return {
      // keyingi to'lqinlar markazdan chetga — "fireworks" ko'rinishi (avatar % da)
      ox: first ? 0 : rand(-26, 26),
      oy: first ? 0 : rand(-26, 20),
      particles: Array.from({ length: perWave }, (_, i) => {
        const kind = pick(fx.kinds);
        const ang = (360 / perWave) * i + rand(-8, 8) + w * 13;
        const dist = rand(0.55, 1) * (fx.distance / 100) * size * spread * (kind === "ember" ? 0.85 : 1);
        const rad = (ang * Math.PI) / 180;
        return {
          id: w * 100 + i,
          kind,
          ang,
          dist,
          dx: Math.sin(rad) * dist * 0.55,
          dy: -rand(0.6, 1.25) * dist,
          size: (kind === "spark" ? rand(9, 16) : kind === "star" ? rand(6, 10) : rand(3, 6.5)) * k,
          color: pick(colors),
          delay: w * 0.16 + rand(0, 0.06),
          dur: rand(0.7, 1.1),
        };
      }),
    };
  });

  return { id, shocks: fx.shockwaves, waves };
}

export function useRankBurst(rank: RankLevel, size: number, sound = false) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const idRef = useRef(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((x) => window.clearTimeout(x));
  }, []);

  const trigger = useCallback(() => {
    const id = ++idRef.current;
    const burst = makeBurst(rank, id, size);
    setBursts((p) => [...p.slice(-2), burst]);
    timers.current.push(
      window.setTimeout(() => setBursts((p) => p.filter((b) => b.id !== id)), 2000),
    );

    const src = FRAME_EFFECTS[rank].sound;
    if (sound && src) {
      const audio = new Audio(src);
      audio.volume = 0.35;
      audio.play().catch(() => {});
    }
  }, [rank, size, sound]);

  return { bursts, trigger };
}

export function RankBurstLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id}>
          {Array.from({ length: b.shocks }, (_, i) => (
            <span key={i} className="rf-shock" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
          {b.waves.map((w, wi) => (
            <div key={wi} className="rf-wave" style={{ left: `${50 + w.ox}%`, top: `${50 + w.oy}%` }}>
              {w.particles.map((p) => (
                <span
                  key={p.id}
                  className={`rf-p rf-p-${p.kind}`}
                  style={
                    {
                      "--ang": `${p.ang}deg`,
                      "--dist": `${p.dist}px`,
                      "--dx": `${p.dx}px`,
                      "--dy": `${p.dy}px`,
                      "--s": `${p.size}px`,
                      "--c": p.color,
                      "--delay": `${p.delay}s`,
                      "--dur": `${p.dur}s`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
