import RankAvatar from "./RankAvatar";
import { normalizeRank } from "./rank-utils";
import type { RankBadgeProps } from "./types";

interface Props extends RankBadgeProps {
  /** Backenddan kelgan daraja: "gold", "Gold", null ... */
  level?: string | null;
}

/**
 * Backend `level` stringini qabul qiladigan qulay wrapper.
 * Eski 10 ta alohida *Badge.tsx fayllar o'rnini bosadi.
 */
export default function RankBadge({ level, ...rest }: Props) {
  return <RankAvatar rank={normalizeRank(level)} {...rest} />;
}
