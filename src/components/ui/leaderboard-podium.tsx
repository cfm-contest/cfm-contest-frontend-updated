"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";

interface LeaderboardRanking {
  userId: string;
  userName: string | null;
  rank: number;
  value: number;
  avatarUrl?: string | null;
}

const podiumVariants = cva("flex items-end justify-center gap-4", {
  variants: {
    size: {
      sm: "gap-2",
      default: "gap-4",
      lg: "gap-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const PODIUM_CONFIG = {
  1: {
    icon: Crown,
    color: "text-yellow-600",
    bg: "bg-yellow-400",
    ringColor: "ring-yellow-400",
    height: "h-32",
    heightSm: "h-24",
    heightLg: "h-40",
  },
  2: {
    icon: Crown,
    color: "text-slate-600",
    bg: "bg-slate-300",
    ringColor: "ring-slate-300",
    height: "h-24",
    heightSm: "h-20",
    heightLg: "h-32",
  },
  3: {
    icon: Crown,
    color: "text-orange-700",
    bg: "bg-orange-400",
    ringColor: "ring-orange-400",
    height: "h-20",
    heightSm: "h-16",
    heightLg: "h-28",
  },
} as const;

interface LeaderboardPodiumProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof podiumVariants> {
  rankings: LeaderboardRanking[];
  showValue?: boolean;
  showAvatar?: boolean;
  medalStyle?: "classic" | "modern" | "minimal";
}

const LeaderboardPodium = React.forwardRef<
  HTMLDivElement,
  LeaderboardPodiumProps
>(
  (
    {
      className,
      size,
      rankings,
      showValue = true,
      showAvatar = true,
      medalStyle = "classic",
      ...props
    },
    ref,
  ) => {
    // Reytingdan 1-, 2-, 3-o'rinlarni olish
    const top3 = rankings
      .filter((ranking) => ranking.rank >= 1 && ranking.rank <= 3)
      .sort((a, b) => a.rank - b.rank);

    // Podium tartibi: 2-o'rin, 1-o'rin, 3-o'rin
    const podiumOrder = [
      top3.find((ranking) => ranking.rank === 2),
      top3.find((ranking) => ranking.rank === 1),
      top3.find((ranking) => ranking.rank === 3),
    ].filter(Boolean) as LeaderboardRanking[];

    if (podiumOrder.length === 0) {
      return null;
    }

    const currentSize = size ?? "default";

    const avatarSize = {
      sm: "h-10 w-10 text-sm",
      default: "h-14 w-14 text-lg",
      lg: "h-20 w-20 text-2xl",
    }[currentSize];

    const iconSize = {
      sm: "h-4 w-4",
      default: "h-5 w-5",
      lg: "h-6 w-6",
    }[currentSize];

    const textSize = {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-base",
    }[currentSize];

    return (
      <div
        ref={ref}
        className={cn(podiumVariants({ size }), className)}
        role="list"
        aria-label="Top 3 rankings"
        {...props}
      >
        {podiumOrder.map((ranking) => {
          const config = PODIUM_CONFIG[ranking.rank as 1 | 2 | 3];

          const displayName =
            ranking.userName || `User ${ranking.userId.slice(0, 6)}`;

          const avatarSrc = ranking.avatarUrl ?? "/temps/avatar.png";

          const podiumHeight = {
            sm: config.heightSm,
            default: config.height,
            lg: config.heightLg,
          }[currentSize];

          const itemLabel = `Rank ${ranking.rank}: ${displayName}${
            showValue ? `, ${ranking.value.toLocaleString()}` : ""
          }`;

          return (
            <div
              key={ranking.userId}
              role="listitem"
              aria-label={itemLabel}
              className="flex flex-col items-center"
            >
              {/* Avatar va medal */}
              <div className="relative mb-2">
                {showAvatar ? (
                  <img
                    src={avatarSrc}
                    alt={`${displayName} avatar`}
                    className={cn(
                      "rounded-full object-cover ring-2",
                      avatarSize,
                      config.ringColor,
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full",
                      avatarSize,
                      config.bg,
                    )}
                  >
                    <config.icon
                      className={cn(iconSize, config.color)}
                    />
                  </div>
                )}

                {medalStyle !== "minimal" && (
                  <div
                    className={cn(
                      "absolute -right-1 -bottom-1 flex items-center justify-center rounded-full bg-background shadow-sm",
                      currentSize === "sm"
                        ? "h-5 w-5"
                        : currentSize === "lg"
                          ? "h-8 w-8"
                          : "h-6 w-6",
                    )}
                  >
                    <config.icon
                      className={cn(
                        config.color,
                        currentSize === "sm"
                          ? "h-3 w-3"
                          : currentSize === "lg"
                            ? "h-5 w-5"
                            : "h-4 w-4",
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Ishtirokchi nomi */}
              <span
                className={cn(
                  "max-w-28 truncate text-center font-medium",
                  textSize,
                )}
                title={displayName}
              >
                {displayName}
              </span>

              {/* Ball */}
              {showValue && (
                <span
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    currentSize === "sm" ? "text-xs" : "text-sm",
                  )}
                >
                  {ranking.value.toLocaleString()}
                </span>
              )}

              {/* Podium pog'onasi */}
              <div
                aria-hidden="true"
                className={cn(
                  "mt-2 w-22 rounded-t-lg",
                  currentSize === "sm" && "w-20",
                  currentSize === "lg" && "w-24",
                  podiumHeight,
                  config.bg,
                  medalStyle === "modern" && "rounded-t-xl",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 items-center justify-center font-bold",
                    config.color,
                  )}
                >
                  {ranking.rank}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);

LeaderboardPodium.displayName = "LeaderboardPodium";

export { LeaderboardPodium, podiumVariants };
export type { LeaderboardPodiumProps, LeaderboardRanking };
