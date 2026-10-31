"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Serverdan kelgan `seconds` dan boshlab mahalliy sanaydi (deadline asosida,
 * shuning uchun tab fonda turganda ham og'ib ketmaydi).
 * `version` o'zgarganda (yangi javob kelganda) qayta sinxronlanadi.
 * 0 ga yetganda `onZero` bir marta chaqiriladi (masalan, ma'lumotni yangilash uchun).
 */
export function useCountdown(
  seconds: number | null | undefined,
  version: unknown,
  onZero?: () => void,
) {
  const [left, setLeft] = useState<number | null>(seconds ?? null);
  const onZeroRef = useRef(onZero);
  onZeroRef.current = onZero;

  useEffect(() => {
    if (seconds == null) {
      setLeft(null);
      return;
    }

    let fired = false;
    const deadline = Date.now() + seconds * 1000;

    const tick = () => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !fired && seconds > 0) {
        fired = true;
        onZeroRef.current?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [seconds, version]);

  return left;
}

export function formatCountdown(total: number): string {
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${p(h)}:${p(m)}:${p(s)}`;
}
