import type { RankLevel } from "../types";
import { RANK_CONFIG } from "../rank-config";
import { rankIndex } from "../rank-utils";

/**
 * canvas-confetti: avatar markazidan yulduz va dumaloq konfetti.
 * Gold dan boshlanadi, rank oshgan sari kuchayadi.
 */
export async function celebrate(rank: RankLevel, el: HTMLElement) {
  const idx = rankIndex(rank);
  if (idx < 3) return;

  const confetti = (await import("canvas-confetti")).default;
  const rect = el.getBoundingClientRect();
  const origin = {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
  const cfg = RANK_CONFIG[rank];
  const colors = [cfg.primary, cfg.secondary, "#ffffff"];
  const shapes: ("star" | "circle")[] = ["star", "circle"];

  confetti({
    particleCount: 30 + idx * 9,
    spread: 70 + idx * 8,
    startVelocity: 28 + idx * 2,
    ticks: 90,
    gravity: 0.9,
    scalar: 0.9,
    origin,
    colors,
    shapes,
    zIndex: 9999,
    disableForReducedMotion: true,
  });

  // diamond+: ikkinchi, sekinroq "yulduz yomg'iri"
  if (idx >= 6) {
    window.setTimeout(() => {
      confetti({
        particleCount: 20 + idx * 3,
        spread: 360,
        startVelocity: 18,
        decay: 0.92,
        ticks: 130,
        scalar: 1.2,
        origin,
        colors,
        shapes: ["star"],
        zIndex: 9999,
        disableForReducedMotion: true,
      });
    }, 160);
  }
}
