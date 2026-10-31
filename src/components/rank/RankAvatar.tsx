"use client";

import Image from "next/image";
import { useCallback, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { RankLevel, RankBadgeProps } from "./types";
import { RANK_CONFIG } from "./rank-config";
import RankFrame, { RankGlow } from "./frames/RankFrame";
import { avatarStyle } from "./frames/frame-fit";
import { RankBurstLayer, useRankBurst } from "./frames/RankBurst";
import { celebrate } from "./effects/celebrate";
import FireworksOverlay from "./effects/FireworksOverlay";
import "./rank-frames.css";

interface Props extends RankBadgeProps {
  rank: RankLevel;
}

export default function RankAvatar({
  rank,
  image,
  size = 120,
  alt = "User avatar",
  className = "",
  interactive = true,
  animated = true,
  sound = true,
  celebrate: celebrateProp,
}: Props) {
  const config = RANK_CONFIG[rank];
  const rootRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const { bursts, trigger } = useRankBurst(rank, size, sound);
  const [fireworks, setFireworks] = useState(false);

  const doCelebrate = celebrateProp ?? size >= 80;
  const hasFireworks = rank === "grandmaster" || rank === "immortal";
  const closeFireworks = useCallback(() => setFireworks(false), []);

  const style = {
    "--rank-primary": config.primary,
    "--rank-secondary": config.secondary,
    "--rank-glow": config.glow,
  } as CSSProperties;

  const activate = () => {
    if (!interactive) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    trigger();
    // pop: ezilish -> kattalashish -> joyiga qaytish + chaqnash
    controls.start({
      scale: [1, 0.9, 1.13, 0.98, 1],
      rotate: [0, 0, -3, 1.5, 0],
      filter: ["brightness(1)", "brightness(1.1)", "brightness(1.7) saturate(1.3)", "brightness(1.15)", "brightness(1)"],
      transition: { duration: 0.7, times: [0, 0.15, 0.4, 0.7, 1], ease: "easeOut" },
    });

    if (doCelebrate) {
      if (rootRef.current) void celebrate(rank, rootRef.current);
      if (hasFireworks) setFireworks(true);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <motion.div
      ref={rootRef}
      className={`rank-avatar relative inline-block shrink-0 ${interactive ? "rf-interactive" : ""} ${className}`}
      style={{ width: size, height: size, ...style }}
      data-rank={rank}
      title={config.label}
      onClick={interactive ? activate : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.96 } : undefined}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
    >
      <motion.div animate={controls} className="absolute inset-0">
        <RankGlow animated={animated} />

        {/* Avatar rasmi — ramka teshigiga o'lchab joylanadi (frame-fit) */}
        <div className="absolute z-[1] overflow-hidden rounded-full bg-neutral-800" style={avatarStyle(rank)}>
          {image ? (
            <Image src={image} alt={alt} fill sizes={`${size}px`} className="object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-bold text-white"
              style={{ fontSize: size * 0.2 }}
              aria-label={alt}
            >
              {size >= 40 ? alt.trim().charAt(0).toUpperCase() || "?" : null}
            </div>
          )}
        </div>

        <RankFrame size={size} rank={rank} animated={animated} />
      </motion.div>

      <RankBurstLayer bursts={bursts} />
      {fireworks && <FireworksOverlay rank={rank} onDone={closeFireworks} />}
    </motion.div>
  );
}
