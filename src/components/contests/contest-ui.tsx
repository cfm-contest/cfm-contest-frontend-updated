"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ContestStatus } from "@/lib/api/contests/contests";

// =========================================================
// VAQT FORMATLASH
// Sana Asia/Tashkent (UTC+5, DST yo'q) bo'yicha chiqariladi. Server va brauzer
// bir xil natija beradi, shuning uchun hydration xatosi bo'lmaydi.
// =========================================================

const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const pad = (n: number) => String(n).padStart(2, "0");

function tashkent(iso: string) {
  const d = new Date(new Date(iso).getTime() + TZ_OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth(),
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    mi: d.getUTCMinutes(),
    valid: !Number.isNaN(d.getTime()),
  };
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const p = tashkent(iso);
  if (!p.valid) return "—";
  return `${pad(p.d)}.${pad(p.mo + 1)}.${p.y} ${pad(p.h)}:${pad(p.mi)}`;
}

export function dateTileParts(iso: string) {
  const p = tashkent(iso);
  return { day: pad(p.d), month: MONTHS[p.mo] ?? "", time: `${pad(p.h)}:${pad(p.mi)}` };
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} soat ${m} daq`;
  if (h) return `${h} soat`;
  return `${m} daq`;
}

/** 3725 -> "1:02:05" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${pad(m)}:${pad(s % 60)}`;
}

/** 3725 -> "1:02" (soat:daqiqa) */
export function formatHM(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}`;
}

export function formatScore(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// =========================================================
// COUNTDOWN — bitta umumiy 1 soniyalik interval hamma taymerlarga xizmat qiladi
// =========================================================

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) timer = setInterval(() => listeners.forEach((l) => l()), 1000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => Math.floor(Date.now() / 1000);
const getServerSnapshot = () => 0;

export function useTick(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const h = pad(Math.floor((total % 86400) / 3600));
  const m = pad(Math.floor((total % 3600) / 60));
  const s = pad(total % 60);
  return days > 0 ? `${days} kun ${h}:${m}:${s}` : `${h}:${m}:${s}`;
}

interface CountdownProps {
  /** Maqsad vaqt (ISO). */
  target: string;
  /** serverVaqti - brauzerVaqti (ms). Foydalanuvchi soati noto'g'ri bo'lsa ham to'g'ri ishlaydi. */
  offsetMs?: number;
  /** Vaqt 0 ga yetganda bir marta chaqiriladi. */
  onZero?: () => void;
  className?: string;
}

export function Countdown({ target, offsetMs = 0, onZero, className }: CountdownProps) {
  const tick = useTick();
  const remaining = tick === 0 ? null : new Date(target).getTime() - (tick * 1000 + offsetMs);

  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [target]);

  useEffect(() => {
    if (remaining !== null && remaining <= 0 && !fired.current) {
      fired.current = true;
      onZero?.();
    }
  }, [remaining, onZero]);

  return (
    <span className={cn("tabular-nums", className)}>
      {remaining === null ? "––:––:––" : formatRemaining(remaining)}
    </span>
  );
}

// =========================================================
// BADGE VA AVATAR
// =========================================================

export function StatusBadge({ status, className }: { status: ContestStatus; className?: string }) {
  if (status === "ongoing") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          className,
        )}
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
        {STATUS_LABEL.ongoing}
      </Badge>
    );
  }
  if (status === "upcoming") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
          className,
        )}
      >
        {STATUS_LABEL.upcoming}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className={cn("text-muted-foreground", className)}>
      {STATUS_LABEL.ended}
    </Badge>
  );
}

function initials(name?: string | null, username?: string | null) {
  const source = (name || username || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function UserAvatar({
  name,
  username,
  src,
  className,
}: {
  name?: string | null;
  username?: string | null;
  src?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {src ? <AvatarImage src={src} alt={name || username || ""} /> : null}
      <AvatarFallback className="text-xs">{initials(name, username)}</AvatarFallback>
    </Avatar>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center">
      <Icon className="mb-3 size-9 text-muted-foreground/60" />
      <h3 className="text-sm font-semibold">{title}</h3>
      {text ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p> : null}
    </div>
  );
}