import type { CSSProperties } from "react";
import type { RankLevel } from "../types";
import { GENERATED_FIT } from "./frame-fit.generated";

/** Avatar ramka ostiga shuncha (o'lchamning ulushi) kirib turadi — tirqish qolmaydi */
export const AVATAR_OVERLAP = 0.04;

/** Rank ramkasi teshigiga to'g'ri keladigan avatar joylashuvi (% da) */
export function avatarStyle(rank: RankLevel): CSSProperties {
  const f = GENERATED_FIT[rank];
  const d = f.d + AVATAR_OVERLAP;
  return {
    width: `${d * 100}%`,
    height: `${d * 100}%`,
    left: `${(f.cx - d / 2) * 100}%`,
    top: `${(f.cy - d / 2) * 100}%`,
  };
}
