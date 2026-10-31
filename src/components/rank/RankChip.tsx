import RankAvatar from "./RankAvatar";
import { RANK_CONFIG } from "./rank-config";
import { normalizeRank } from "./rank-utils";

interface Props {
  level?: string | null;
  className?: string;
}

/** Kichik "pill": mini ramka + daraja nomi (ro'yxatlar, kartalar uchun) */
export default function RankChip({ level, className = "" }: Props) {
  const rank = normalizeRank(level);
  const c = RANK_CONFIG[rank];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2.5 text-xs font-semibold ${className}`}
      style={{ borderColor: `${c.primary}66`, color: c.primary, background: c.glow }}
    >
      <RankAvatar rank={rank} size={28} interactive={false} animated={false} alt="" />
      {c.label}
    </span>
  );
}
