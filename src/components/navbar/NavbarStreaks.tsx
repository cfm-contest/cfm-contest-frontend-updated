"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Snowflake, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavbarStreaks as Data } from "@/hooks/useNavbarStreaks";
import {
  AnimatedBolt,
  AnimatedFlame,
  AnimatedNumber,
  FloatingGain,
  StreakAnimStyles,
  useIncrease,
  type FlameState,
} from "./StreakIcons";
import Link from "next/link";

type Props = {
  data: Data | null;
  loading: boolean;
  error: boolean;
};

export function NavbarStreaks({ data, loading, error }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Tashqariga bosilganda yopish */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* --- Animatsiya triggerlari (hook'lar har doim chaqirilishi shart) --- */
  const streakIncrease = useIncrease(data?.streak.current);
  const xpIncrease = useIncrease(data?.xp.total);
  const todayXpIncrease = useIncrease(data?.xp.today);

  /* Olov holati */
  const flameState: FlameState = useMemo(() => {
    if (!data) return "off";
    if (data.streak.doneToday) return "lit";
    if (data.streak.current > 0) return "risk";
    return "off";
  }, [data]);

  /* --- Loading / Error / Bo'sh holatlar --- */
  if (error && !data) return null;

  if (loading && !data) {
    return <div className="h-8 w-28 animate-pulse rounded-md bg-slate-100" />;
  }
  if (!data) return null;

  const { streak, xp } = data;
  const atRisk = streak.current > 0 && !streak.doneToday;

  return (
    <>
      {/* CSS keyframes — navbar ichida bir marta */}
      <StreakAnimStyles />

      <div className="relative" ref={ref}>
        {/* ====================== TUGMA (collapsed) ====================== */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Streak va XP"
          aria-expanded={open}
          className={cn(
            "flex items-center gap-1 rounded-md border px-1.5 py-1 text-sm transition-colors",
            open
              ? "border-slate-300 bg-slate-50"
              : "border-transparent hover:border-slate-200 hover:bg-slate-50"
          )}
        >
          {/* Streak */}
          <span
            className={cn(
              "relative flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold tabular-nums",
              streak.doneToday
                ? "text-orange-600"
                : streak.current > 0
                ? "text-slate-500"
                : "text-slate-400"
            )}
          >
            <AnimatedFlame
              state={flameState}
              burst={streakIncrease.active}
              burstKey={streakIncrease.key}
              className="size-4"
            />

            <AnimatedNumber
              value={streak.current}
              pop={streakIncrease.active}
              popKey={streakIncrease.key}
            />

            {/* +N uchib chiqadi */}
            {streakIncrease.active && streakIncrease.delta > 0 && (
              <FloatingGain
                text={`+${streakIncrease.delta}`}
                className="text-orange-500"
              />
            )}

            {atRisk && (
              <span className="ml-0.5 size-1.5 animate-pulse rounded-full bg-red-500" />
            )}
          </span>

          {/* XP (sm+ da ko'rinadi) */}
          <span className="relative hidden items-center gap-1 rounded px-1.5 py-0.5 font-semibold tabular-nums text-amber-600 sm:flex">
            <AnimatedBolt
              burst={xpIncrease.active}
              burstKey={xpIncrease.key}
              className="size-4"
            />

            <AnimatedNumber
              value={xp.total}
              pop={xpIncrease.active}
              popKey={xpIncrease.key}
            />

            {xpIncrease.active && xpIncrease.delta > 0 && (
              <FloatingGain
                text={`+${xpIncrease.delta}`}
                className="text-amber-500"
              />
            )}
          </span>
        </button>

        {/* ====================== DROPDOWN ====================== */}
        {open && (
          <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {/* Streak bo'limi */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full transition-colors",
                      streak.doneToday ? "bg-orange-100" : "bg-slate-100"
                    )}
                  >
                    <AnimatedFlame
                      state={flameState}
                      burst={streakIncrease.active}
                      burstKey={streakIncrease.key}
                      className="size-5"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      <AnimatedNumber
                        value={streak.current}
                        pop={streakIncrease.active}
                        popKey={streakIncrease.key}
                      />{" "}
                      kunlik streak
                    </p>
                    <p className="text-xs text-slate-400">
                      Eng uzun: {streak.longest} kun
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-center gap-1 text-xs text-sky-600"
                  title="Streak muzlatgichlari"
                >
                  <Snowflake className="size-3.5" />
                  {streak.freezes}
                </div>
              </div>

              <div
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-xs",
                  streak.doneToday
                    ? "bg-emerald-50 text-emerald-700"
                    : atRisk
                    ? "bg-red-50 text-red-700"
                    : "bg-slate-50 text-slate-500"
                )}
              >
                {streak.doneToday ? (
                  <>
                    <Check className="size-3.5" /> Bugungi vazifa bajarildi
                  </>
                ) : atRisk ? (
                  "Streakni saqlash uchun bugun masala yeching!"
                ) : (
                  "Bugun birinchi masalani yeching va streakni boshlang"
                )}
              </div>
            </div>

            {/* XP / Level bo'limi */}

            <Link href="/ranks" className="block">
              <div className="border-t border-slate-100 px-4 py-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {xp.levelLabel}
                    </p>

                    <p className="relative text-xs text-slate-500">
                      Bugun{" "}
                      <span className="font-semibold text-amber-600 tabular-nums">
                        +{xp.today} XP
                      </span>
                      {todayXpIncrease.active && todayXpIncrease.delta > 0 && (
                        <FloatingGain
                          text={`+${todayXpIncrease.delta}`}
                          className="text-amber-500"
                        />
                      )}
                    </p>
                  </div>

                  {/* Progress bar — o'sishda animatsiya bilan */}
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-valuenow={xp.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >

                      <div
                        className={cn(
                          "h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700 ease-out",
                          xpIncrease.active && "shadow-[0_0_10px_rgba(251,146,60,.8)]"
                        )}
                        style={{ width: `${xp.progress}%` }}
                      />
                    </div>

                    <div className="mt-1.5 flex justify-between text-xs text-slate-400 tabular-nums">
                      <span>
                        <AnimatedNumber
                          value={xp.total}
                          pop={xpIncrease.active}
                          popKey={xpIncrease.key}
                        />{" "}
                        XP
                      </span>
                      <span>
                        {xp.toNext > 0
                          ? `Keyingi darajagacha ${xp.toNext.toLocaleString("uz-UZ")} XP`
                          : "Eng yuqori daraja"}
                      </span>
                    </div>

              </div>
            </Link>

          </div>
        )}
      </div>
    </>
  );
}
