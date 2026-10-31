import type { CSSProperties } from "react";
import { Check, Lock } from "lucide-react";
import RankAvatar from "./RankAvatar";
import RankProgress from "./RankProgress";
import { RANK_CONFIG } from "./rank-config";
import { RANK_THRESHOLDS, formatXp, rankFromXp } from "./rank-utils";
import { RANK_LEVELS } from "./types";

interface Props {
  xp: number;
  /** Foydalanuvchi avatari — har bir ramkada ko'rsatiladi */
  image?: string | null;
  name?: string;
  className?: string;
}

/**
 * Barcha 10 daraja ro'yxati: ochilganlar rangli, hozirgisi yoritilgan va
 * animatsiyali, yopiqlari xira. Har bir ramkani bosib effektni ko'rish mumkin.
 */
export default function RankLevelsList({ xp, image, name = "User", className = "" }: Props) {
  const currentIdx = RANK_LEVELS.indexOf(rankFromXp(xp));

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6 ${className}`}>
      <RankProgress xp={xp} className="mb-4" />

      <ul className="space-y-1">
        {RANK_LEVELS.map((rank, i) => {
          const c = RANK_CONFIG[rank];
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          const missing = RANK_THRESHOLDS[rank] - xp;

          return (
            <li
              key={rank}
              aria-current={isCurrent ? "step" : undefined}
              className="flex items-center gap-4 rounded-xl px-3 py-2.5"
              style={
                isCurrent
                  ? ({ background: c.glow, boxShadow: `inset 0 0 0 1px ${c.primary}66` } as CSSProperties)
                  : undefined
              }
            >
              <div className={`flex size-[92px] shrink-0 items-center justify-center ${reached ? "" : "opacity-45 grayscale"}`}>
                <RankAvatar rank={rank} image={image} alt={name} size={84} animated={isCurrent} celebrate={false} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-neutral-900">{c.label}</p>
                <p className="text-xs tabular-nums text-neutral-500">{formatXp(RANK_THRESHOLDS[rank])} XP</p>
              </div>

              {isCurrent ? (
                <span
                  className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ background: c.primary }}
                >
                  Hozirgi daraja
                </span>
              ) : reached ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="size-4" /> Ochilgan
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-xs text-neutral-500">
                  <Lock className="size-3.5" /> {formatXp(missing)} XP qoldi
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
