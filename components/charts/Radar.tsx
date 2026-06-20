"use client";

import { useTheme } from "@/lib/ui/theme";
import { DIMS } from "@/lib/ui/dims";

export interface RadarSeries {
  color: string;
  // rating by dimension key (0..100), with optional sigma + provisional flag
  values: Record<string, { rating: number; sigma?: number; provisional?: boolean }>;
}

// Ported from the design's `radar()`.
export function Radar({
  series,
  withBands = false,
}: {
  series: RadarSeries[];
  withBands?: boolean;
}) {
  const { pal } = useTheme();
  const W = 380,
    H = 300,
    cx = 190,
    cy = 150,
    R = 98;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / DIMS.length;
  const pt = (i: number, v: number): [number, number] => [
    cx + Math.cos(ang(i)) * R * (v / 100),
    cy + Math.sin(ang(i)) * R * (v / 100),
  ];

  const els: React.ReactNode[] = [];

  [25, 50, 75, 100].forEach((rg, k) => {
    const pts = DIMS.map((_d, i) => pt(i, rg).join(",")).join(" ");
    els.push(<polygon key={"rg" + k} points={pts} fill="none" stroke={pal.grid} strokeWidth={1} />);
  });

  DIMS.forEach((d, i) => {
    const e = pt(i, 100);
    els.push(<line key={"ax" + i} x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke={pal.grid} strokeWidth={1} />);
    const lx = cx + Math.cos(ang(i)) * (R + 18);
    const ly = cy + Math.sin(ang(i)) * (R + 18);
    const an = Math.abs(Math.cos(ang(i))) < 0.3 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
    els.push(
      <text key={"lb" + i} x={lx} y={ly + 3} textAnchor={an as any} fontSize={10} fontWeight={600} fill={pal.muted} fontFamily="Inter">
        {d.short}
      </text>
    );
  });

  series.forEach((s, si) => {
    const col = s.color;
    const pts = DIMS.map((d, i) => pt(i, s.values[d.key]?.rating ?? 0).join(",")).join(" ");
    els.push(
      <polygon
        key={"pl" + si}
        points={pts}
        fill={col}
        fillOpacity={withBands ? 0.13 : 0.1}
        stroke={col}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    );
    DIMS.forEach((d, i) => {
      const v = s.values[d.key]?.rating ?? 0;
      const sig = s.values[d.key]?.sigma ?? 0;
      const prov = s.values[d.key]?.provisional ?? false;
      const pp = pt(i, v);
      if (withBands && sig) {
        const a = pt(i, Math.max(0, v - sig));
        const b = pt(i, Math.min(100, v + sig));
        els.push(
          <line key={"wk" + si + i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={5} strokeOpacity={0.22} strokeLinecap="round" />
        );
      }
      els.push(
        <circle
          key={"dt" + si + i}
          cx={pp[0]}
          cy={pp[1]}
          r={prov ? 3.5 : 3.2}
          fill={prov ? pal.surface : col}
          stroke={col}
          strokeWidth={prov ? 1.6 : 0}
          strokeDasharray={prov ? "2 2" : "0"}
        />
      );
    });
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ maxWidth: 380, height: "auto", display: "block" }}
      role="img"
      aria-label="Radar chart of trust dimensions"
    >
      {els}
    </svg>
  );
}
