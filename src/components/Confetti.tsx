// Confetti sobre pour la confirmation Gold — pur CSS, ~28 brins aux couleurs
// de la palette (import depuis theme/tokens.ts, seule source de hex côté TS).
// Respecte prefers-reduced-motion (masqué en CSS).

import { useMemo } from "react";
import { confettiColors } from "../theme/tokens";

const PIECES = 28;

export default function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        delay: `${((i * 173) % 900) / 1000}s`,
        color: confettiColors[i % confettiColors.length],
      })),
    [],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}
