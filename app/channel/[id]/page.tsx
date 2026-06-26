"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/ui/theme";
import { DIMS } from "@/lib/ui/dims";
import { Radar, type RadarSeries } from "@/components/charts/Radar";

interface Profile {
  channel: {
    id: string;
    name: string;
    medium: string;
    entity_type: string;
    content_type: string | null;
    language: string | null;
    country: string | null;
    verified: boolean;
  };
  radar: Array<{
    dimension: { key: string; label: string } | undefined;
    rating: number;
    sigma: number;
    n_statements: number;
    ranked: boolean;
  }>;
  stats: { subs: number | null; views: number | null; followers: number | null } | null;
  statements: Array<{ id: string; text: string; source_url: string | null }>;
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? Math.round(n / 1e3) + "K" : String(n);
}

export default function ChannelPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { pal } = useTheme();
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/channels/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "failed");
        return d;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <main style={{ maxWidth: 1080, margin: "0 auto", padding: 44 }}><p style={{ color: "#c0392b" }}>{error}</p></main>;
  if (!data) return <main style={{ maxWidth: 1080, margin: "0 auto", padding: 44 }}><p style={{ color: "var(--muted)" }}>Loading…</p></main>;

  const { channel, radar, stats, statements } = data;

  const values: RadarSeries["values"] = {};
  for (const d of DIMS) {
    const row = radar.find((r) => r.dimension?.key === d.key);
    values[d.key] = row
      ? { rating: row.rating, sigma: row.sigma, provisional: !row.ranked }
      : { rating: 0, sigma: 0, provisional: true };
  }
  const series: RadarSeries[] = [{ color: pal.accent, values }];

  const tags = [channel.medium, channel.content_type, channel.language, channel.country].filter(Boolean) as string[];
  const ratedCount = radar.reduce((a, r) => a + r.n_statements, 0);
  const hasProvisional = radar.some((r) => !r.ranked);

  const reach = [
    { value: fmt(stats?.subs ?? stats?.followers), label: stats?.subs != null ? "subscribers" : "followers" },
    { value: fmt(stats?.views), label: "views" },
    { value: hasProvisional ? "partial" : "full", label: "coverage" },
  ];

  const card: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", padding: 20 };

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(20px,4vw,44px) clamp(15px,4vw,40px) 90px" }}>
      <style>{`
        @media (max-width: 640px) {
          .pr-reach-disclaimer {
            margin-left: 0 !important;
            text-align: left !important;
            max-width: 100% !important;
          }
        }
      `}</style>
      <button onClick={() => router.push("/leaderboard")} style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18 }}>← Leaderboard</button>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "none", width: 62, height: 62, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Newsreader,serif", fontSize: 26, fontWeight: 600 }}>
          {channel.name[0]}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontWeight: 500, fontSize: "clamp(26px,4vw,36px)", margin: 0, lineHeight: 1.05, letterSpacing: "-.01em" }}>
              {channel.name}
            </h1>
            {channel.verified && (
              <span style={{ flex: "none", width: 19, height: 19, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>✓</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 11 }}>
            {tags.map((t) => (
              <span key={t} style={{ fontSize: 12, fontWeight: 500, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--line)", color: "var(--muted)" }}>{t}</span>
            ))}
          </div>
        </div>
        <button onClick={() => router.push(`/compare?ids=${channel.id}`)} style={{ flex: "none", padding: "10px 16px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 600, fontSize: 13.5 }}>
          Add to compare
        </button>
      </div>

      <div style={{ marginTop: 18, padding: "14px 16px", border: "1px dashed var(--line)", borderRadius: 12, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
        {reach.map((m) => (
          <div key={m.label}>
            <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 17 }}>{m.value}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{m.label}</div>
          </div>
        ))}
        <div className="pr-reach-disclaimer" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--faint)", maxWidth: "32ch", textAlign: "right" }}>
          Reach is context only — it is <em>not</em> part of the rating.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 24, marginTop: 30 }}>
        <div style={card}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Trust profile</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 6 }}>Five dimensions · whiskers show ±σ confidence</div>
          {ratedCount > 0 ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Radar series={series} withBands />
            </div>
          ) : (
            <div style={{ padding: 30, textAlign: "center", color: "var(--faint)", fontSize: 13 }}>Not yet rated — needs blind votes first.</div>
          )}
          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)", display: "flex", gap: 14, flexWrap: "wrap" }}>
            <span>● rated</span>
            <span style={{ color: "var(--accent2)" }}>◌ provisional (low sample)</span>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Recent rated statements</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {statements.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--muted)" }}>No statements harvested yet.</div>
            )}
            {statements.map((s) => (
              <div key={s.id} style={{ border: "1px solid var(--line)", borderRadius: 13, background: "var(--surface)", padding: "14px 15px" }}>
                <div style={{ fontFamily: "Inter,'Hind',sans-serif", fontSize: 14.5, lineHeight: 1.5 }}>{s.text}</div>
                {s.source_url && (
                  <div style={{ marginTop: 10 }}>
                    <a href={s.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--muted)", textDecoration: "underline" }}>source ↗</a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
