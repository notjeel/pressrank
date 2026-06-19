"use client";

import { useTheme } from "@/lib/ui/theme";

// Ported from the design's `miniBar()` — a point with a ±σ confidence whisker.
export function MiniBar({ rating, sigma }: { rating: number; sigma: number }) {
  const { pal } = useTheme();
  const W = 120,
    H = 14;
  const x = (v: number) => (v / 100) * W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: 150 }}>
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={pal.grid} strokeWidth={2} />
      <line
        x1={x(Math.max(0, rating - sigma))}
        y1={H / 2}
        x2={x(Math.min(100, rating + sigma))}
        y2={H / 2}
        stroke={pal.accent}
        strokeOpacity={0.3}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <circle cx={x(rating)} cy={H / 2} r={4} fill={pal.accent} />
    </svg>
  );
}

// Ported from the design's `cmpBar()` — stacked horizontal bars for compare.
export function CmpBar({ rows }: { rows: { color: string; v: number }[] }) {
  const { pal } = useTheme();
  const W = 240,
    bh = 9,
    gap = 6;
  const H = rows.length * (bh + gap);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: 340 }}>
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={0} y={i * (bh + gap)} width={W} height={bh} rx={bh / 2} fill={pal.grid} />
          <rect x={0} y={i * (bh + gap)} width={(r.v / 100) * W} height={bh} rx={bh / 2} fill={r.color} />
          <text
            x={(r.v / 100) * W - 4}
            y={i * (bh + gap) + bh - 1.5}
            textAnchor="end"
            fontSize={7.5}
            fontWeight={700}
            fill="#fff"
            fontFamily="Inter"
          >
            {Math.round(r.v)}
          </text>
        </g>
      ))}
    </svg>
  );
}
