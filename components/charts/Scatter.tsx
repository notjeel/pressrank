"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ui/theme";

export interface ScatterPoint {
  channel: { id: string; name: string; medium: string };
  x: number;
  y: number;
}

// Ported from the design's `scatter()`. variant "bc" = Bias×Credibility
// (x is a 0..100 rating); "rt" = Reach×Trust (x is audience size, log scale).
export function Scatter({
  points,
  variant,
}: {
  points: ScatterPoint[];
  variant: "bc" | "rt";
}) {
  const { pal } = useTheme();
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const W = 460,
    H = 350,
    padL = 44,
    padR = 16,
    padT = 16,
    padB = 40;
  const ix = padL,
    iw = W - padL - padR,
    iy = padT,
    ih = H - padT - padB;
  const isBC = variant === "bc";

  const fmtReach = (n: number) =>
    n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : Math.round(n / 1e3) + "K";

  // x domain
  const safeLog = (v: number) => Math.log10(Math.max(v, 1));
  const xRaw = points.map((p) => (isBC ? p.x : safeLog(p.x)));
  let xmin = isBC ? 0 : Math.min(safeLog(3e5), ...(xRaw.length ? xRaw : [0]));
  let xmax = isBC ? 100 : Math.max(safeLog(1.1e7), ...(xRaw.length ? xRaw : [7]));
  if (xmin === xmax) xmax = xmin + 1;
  const X = (v: number) => ix + ((v - xmin) / (xmax - xmin)) * iw;
  const Y = (v: number) => iy + ih - (v / 100) * ih;

  const xMid = isBC ? 50 : (xmin + xmax) / 2;
  const yMid = 62;

  const els: React.ReactNode[] = [];
  els.push(
    <rect key="fr" x={ix} y={iy} width={iw} height={ih} fill="none" stroke={pal.grid} strokeWidth={1} rx={6} />
  );
  els.push(
    <line key="cx" x1={X(xMid)} y1={iy} x2={X(xMid)} y2={iy + ih} stroke={pal.grid} strokeDasharray="3 4" />
  );
  els.push(
    <line key="cy" x1={ix} y1={Y(yMid)} x2={ix + iw} y2={Y(yMid)} stroke={pal.grid} strokeDasharray="3 4" />
  );

  const ql: [string, number, number, "start" | "end"][] = isBC
    ? [
        ["Accurate, but slanted", ix + 8, iy + 15, "start"],
        ["Trusted & balanced", ix + iw - 8, iy + 15, "end"],
        ["Slanted & loose", ix + 8, iy + ih - 8, "start"],
        ["Balanced, but loose", ix + iw - 8, iy + ih - 8, "end"],
      ]
    : [
        ["Niche & trusted", ix + 8, iy + 15, "start"],
        ["Big & trusted", ix + iw - 8, iy + 15, "end"],
        ["Niche, low trust", ix + 8, iy + ih - 8, "start"],
        ["BIG REACH, LOW TRUST", ix + iw - 8, iy + ih - 8, "end"],
      ];
  ql.forEach((q, i) =>
    els.push(
      <text
        key={"q" + i}
        x={q[1]}
        y={q[2]}
        textAnchor={q[3]}
        fontSize={9.5}
        fontWeight={i === 3 && !isBC ? 700 : 500}
        letterSpacing=".04em"
        fill={i === 3 && !isBC ? pal.accent : pal.faint}
        fontFamily="Inter"
      >
        {q[0]}
      </text>
    )
  );

  // axis ticks
  if (isBC) {
    [0, 50, 100].forEach((t, i) =>
      els.push(
        <text key={"xt" + i} x={X(t)} y={iy + ih + 15} textAnchor="middle" fontSize={9} fill={pal.muted} fontFamily="Inter">
          {t}
        </text>
      )
    );
  } else {
    ([[3e5, "300K"], [1e6, "1M"], [3e6, "3M"], [1e7, "10M"]] as [number, string][]).forEach(
      (t, i) => {
        const xv = safeLog(t[0]);
        if (xv < xmin - 0.05 || xv > xmax + 0.05) return;
        els.push(
          <text key={"xt" + i} x={X(xv)} y={iy + ih + 15} textAnchor="middle" fontSize={9} fill={pal.muted} fontFamily="Inter">
            {t[1]}
          </text>
        );
      }
    );
  }
  [20, 60, 100].forEach((t, i) =>
    els.push(
      <text key={"yt" + i} x={ix - 7} y={Y(t) + 3} textAnchor="end" fontSize={9} fill={pal.muted} fontFamily="Inter">
        {t}
      </text>
    )
  );

  // points
  points.forEach((p) => {
    const cx = X(isBC ? p.x : safeLog(p.x));
    const cy = Y(p.y);
    const on = hover === p.channel.id;
    const watch = p.y < yMid && (isBC ? p.x < xMid : safeLog(p.x) > xMid);
    els.push(
      <circle
        key={"p" + p.channel.id}
        cx={cx}
        cy={cy}
        r={on ? 7 : 5}
        fill={watch ? pal.accent2 : pal.accent}
        opacity={on ? 1 : 0.82}
        stroke={pal.surface}
        strokeWidth={1.5}
        style={{ cursor: "pointer", transition: "r .1s" }}
        onMouseEnter={() => setHover(p.channel.id)}
        onMouseLeave={() => setHover(null)}
        onClick={() => router.push(`/channel/${p.channel.id}`)}
      />
    );
  });

  // tooltip
  const hp = points.find((p) => p.channel.id === hover);
  if (hp) {
    const cx = X(isBC ? hp.x : safeLog(hp.x));
    const cy = Y(hp.y);
    const label = hp.channel.name;
    const sub = isBC
      ? `${hp.channel.medium} · ${hp.x.toFixed(1)}`
      : `${hp.channel.medium} · ${fmtReach(hp.x)}`;
    const w = Math.max(label.length, sub.length) * 6.4 + 18;
    let tx = cx + 10;
    if (tx + w > W) tx = cx - 10 - w;
    let ty = cy - 34;
    if (ty < iy) ty = cy + 12;
    els.push(
      <g key="tt">
        <rect x={tx} y={ty} width={w} height={30} rx={6} fill={pal.fg} opacity={0.96} />
        <text x={tx + 9} y={ty + 13} fontSize={10.5} fontWeight={700} fill={pal.bg} fontFamily="Inter">
          {label}
        </text>
        <text x={tx + 9} y={ty + 24} fontSize={9} fill={pal.bg} opacity={0.8} fontFamily="Inter">
          {sub}
        </text>
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block", height: "auto" }}
      role="img"
      aria-label={isBC ? "Bias by credibility scatter plot" : "Reach by trust scatter plot"}
    >
      {els}
    </svg>
  );
}
