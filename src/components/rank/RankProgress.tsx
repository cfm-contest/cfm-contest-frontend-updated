"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { RANK_CONFIG } from "./rank-config";
import { formatXp, getRankProgress } from "./rank-utils";
import "./rank-frames.css";

interface Props {
  xp: number;
  className?: string;
  /** Qorong'i fon (masalan profil hero) uchun ranglar */
  dark?: boolean;
  /** Daraja nomi va XP sarlavhasini ko'rsatish (default: true) */
  showHeader?: boolean;
}

/** XP progress: joriy daraja -> keyingi daraja (Django progress_percent bilan mos) */
export default function RankProgress({ xp, className = "", dark = false, showHeader = true }: Props) {
  const p = getRankProgress(xp);
  const cur = RANK_CONFIG[p.rank];
  const next = p.nextRank ? RANK_CONFIG[p.nextRank] : null;

  return (
    <div
      className={className}
      style={{ "--rank-primary": cur.primary, "--rank-secondary": cur.secondary } as CSSProperties}
    >
      {showHeader && (
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold" style={{ color: cur.primary }}>{cur.label}</span>
          <span className={`tabular-nums ${dark ? "text-white/50" : "text-neutral-500"}`}>{formatXp(xp)} XP</span>
        </div>
      )}

      <div
        className={`h-3 overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-neutral-200 dark:bg-neutral-800"}`}
        role="progressbar"
        aria-valuenow={p.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          key={p.rank}
          className="rf-bar h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${p.percent}%` }}
          transition={{ type: "spring", stiffness: 70, damping: 18 }}
          style={{
            background: `linear-gradient(90deg, ${cur.primary}, ${cur.secondary})`,
            boxShadow: `0 0 12px ${cur.glow}`,
          }}
        />
      </div>

      <p className={`mt-1.5 text-xs ${dark ? "text-white/50" : "text-neutral-500"}`}>
        {next ? `${next.label} darajasigacha ${formatXp(p.xpToNext)} XP qoldi` : "Eng yuqori daraja!"}
      </p>
    </div>
  );
}
