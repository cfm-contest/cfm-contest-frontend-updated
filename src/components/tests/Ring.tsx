"use client";

import { useEffect, useState, type ReactNode } from "react";
import "react-circular-progressbar/dist/styles.css";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";

interface RingProps {
  value: number;
  max?: number;
  size?: number;
  stroke?: number; // 1..100 (react-circular-progressbar strokeWidth)
  color?: string;
  trail?: string;
  children?: ReactNode;
  className?: string;
}

/** 0 dan boshlab silliq to'ladi (birinchi renderdan keyin qiymat beriladi). */
export function Ring({
  value,
  max = 100,
  size = 96,
  stroke = 10,
  color = "#f59e0b",
  trail = "#e2e8f0",
  children,
  className,
}: RingProps) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div style={{ width: size, height: size }} className={className}>
      <CircularProgressbarWithChildren
        value={shown}
        minValue={0}
        maxValue={Math.max(max, 1)}
        strokeWidth={stroke}
        styles={buildStyles({
          pathColor: color,
          trailColor: trail,
          strokeLinecap: "round",
          pathTransitionDuration: 0.8,
        })}
      >
        {children}
      </CircularProgressbarWithChildren>
    </div>
  );
}
