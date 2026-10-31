"use client";

import Image from "next/image";
import { useId, type CSSProperties } from "react";
import type { RankFrameProps } from "../types";
import { FRAME_EFFECTS } from "./frame-effects";
import { GENERATED_FIT } from "./frame-fit.generated";

const STAR = "M0 -3.2 L0.9 -0.9 L3.2 0 L0.9 0.9 L0 3.2 L-0.9 0.9 L-3.2 0 L-0.9 -0.9 Z";
const css = (v: Record<string, string | number>) => v as CSSProperties;

/** Ramka ORQASIDAGI yumshoq nur (avatar ostida turadi) */
export function RankGlow({ animated = true }: { animated?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`rf-glow pointer-events-none absolute z-0 ${animated ? "" : "rf-static"}`}
    />
  );
}

/**
 * public/frames/{rank}.svg rasmi + ustidan jonli effektlar:
 * rasm shakli bo'ylab yaltirash, nafas olish, jaqmoqchalar, orbitalar, suzuvchi zarralar.
 */
export default function RankFrame({ size, rank, animated = true, className = "" }: RankFrameProps) {
  const uid = useId().replace(/:/g, "");
  const fx = FRAME_EFFECTS[rank];
  const fit = GENERATED_FIT[rank];
  const rich = animated && size >= 56;
  const src = `/frames/${rank}.svg`;

  // viewBox (0..100) koordinatalarida: teshik markazi va radiusi
  const cx = +(fit.cx * 100).toFixed(2);
  const cy = +(fit.cy * 100).toFixed(2);
  const rh = +(fit.d * 50).toFixed(2);
  const origin = `${cx}px ${cy}px`;

  const pt = (deg: number, r: number) => {
    const a = (deg * Math.PI) / 180;
    return { x: +(cx + r * Math.sin(a)).toFixed(2), y: +(cy - r * Math.cos(a)).toFixed(2) };
  };

  const sparkleRadii = [rh + 5, (rh + 46) / 2, 45.5];

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-10 ${animated ? "" : "rf-static"} ${className}`}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        unoptimized
        draggable={false}
        className={`absolute inset-0 h-full w-full select-none object-contain ${rich ? "rf-art-breathe" : ""}`}
      />

      {/* yaltirash: faqat rasmning o'zi (mask) bo'ylab o'tadi */}
      {rich && fx.shineSeconds > 0 && (
        <div
          className="rf-sweep absolute inset-0"
          style={css({ "--rf-mask": `url(${src})`, "--rf-dur": `${fx.shineSeconds}s` })}
        />
      )}

      {rich && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter id={`${uid}-glow`} x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* suzuvchi zarralar */}
          {fx.ambient.kind === "ember" &&
            Array.from({ length: fx.ambient.count }, (_, i) => {
              const deg = -75 + (150 / Math.max(1, fx.ambient.count - 1)) * i;
              const { x, y } = pt(deg, rh + 7 + (i % 3) * 3);
              return (
                <circle
                  key={`e${i}`}
                  className="rf-amb-rise"
                  cx={x}
                  cy={y}
                  r={+(0.7 + (i % 3) * 0.35).toFixed(2)}
                  fill={i % 2 ? "var(--rank-secondary)" : "var(--rank-primary)"}
                  filter={`url(#${uid}-glow)`}
                  style={css({
                    "--dx": `${(i % 2 ? 1 : -1) * (2 + (i % 4))}px`,
                    "--dy": `${-(10 + (i % 4) * 3)}px`,
                    animationDelay: `${(i * 0.45).toFixed(2)}s`,
                    animationDuration: `${(1.8 + (i % 3) * 0.5).toFixed(1)}s`,
                  })}
                />
              );
            })}

          {fx.ambient.kind === "mote" &&
            Array.from({ length: fx.ambient.count }, (_, i) => {
              const { x, y } = pt(i * (360 / fx.ambient.count) + 17, rh + 6 + (i % 3) * 5);
              return (
                <circle
                  key={`m${i}`}
                  className="rf-amb-float"
                  cx={x}
                  cy={y}
                  r={+(0.6 + (i % 3) * 0.3).toFixed(2)}
                  fill="var(--rank-secondary)"
                  filter={`url(#${uid}-glow)`}
                  style={css({
                    animationDelay: `${(i * 0.6).toFixed(2)}s`,
                    animationDuration: `${(3.2 + (i % 4) * 0.6).toFixed(1)}s`,
                  })}
                />
              );
            })}

          {/* teshik cheti bo'ylab aylanuvchi yorug' nuqtalar */}
          {Array.from({ length: fx.orbiters }, (_, i) => {
            const dur = 5 + i * 1.5;
            return (
              <g
                key={`o${i}`}
                className={`rf-spin ${i % 2 ? "rf-rev" : ""}`}
                style={css({
                  "--rf-dur": `${dur}s`,
                  animationDelay: `-${((dur / fx.orbiters) * i).toFixed(2)}s`,
                  transformOrigin: origin,
                })}
              >
                <circle cx={cx} cy={+(cy - (rh + 3.5)).toFixed(2)} r="1.4" fill="#fff" filter={`url(#${uid}-glow)`} />
              </g>
            );
          })}

          {/* jaqmoqchalar */}
          {Array.from({ length: fx.sparkles }, (_, i) => {
            const deg = i * (360 / fx.sparkles) + (i % 2 ? 11 : 0);
            const { x, y } = pt(deg, sparkleRadii[i % 3]);
            const s = +(0.6 + (i % 3) * 0.25).toFixed(2);
            return (
              <g key={`s${i}`} transform={`translate(${x} ${y}) scale(${s})`}>
                <path
                  className="rf-twinkle"
                  d={STAR}
                  fill="#fff"
                  style={{
                    animationDelay: `${(i * 0.43).toFixed(2)}s`,
                    animationDuration: `${(2.2 + (i % 4) * 0.4).toFixed(1)}s`,
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
