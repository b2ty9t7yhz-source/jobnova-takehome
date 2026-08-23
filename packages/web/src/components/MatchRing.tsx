import type { CSSProperties } from "react";
import { matchTone } from "../lib/recommendation";

interface MatchRingProps {
  score: number;
  size?: "small" | "large";
}

export function MatchRing({ score, size = "small" }: MatchRingProps) {
  const style = { "--match-score": `${score * 3.6}deg` } as CSSProperties;

  return (
    <div className={`match-ring ${size} ${matchTone(score)}`} style={style} aria-label={`${score}% match`}>
      <span>
        <strong>{score}%</strong>
        <small>Match</small>
      </span>
    </div>
  );
}
