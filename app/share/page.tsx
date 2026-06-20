"use client";

import { useEffect, useState } from "react";

interface Featured {
  id: string;
  name: string;
  medium: string;
  content_type: string | null;
  factual: number;
  factualSigma: number;
  neutrality: number;
}

const SIZES = {
  wa: { w: 340, h: 340, pad: "26px", name: "34px", label: "WhatsApp · 1080×1080" },
  x: { w: 420, h: 235, pad: "22px", name: "30px", label: "X · 1200×675" },
  story: { w: 248, h: 440, pad: "26px", name: "34px", label: "Instagram story · 1080×1920" },
} as const;
type SizeKey = keyof typeof SIZES;

export default function SharePage() {
  const [size, setSize] = useState<SizeKey>("wa");
  const [feat, setFeat] = useState<Featured | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    fetch("/api/leaderboard?dimension=factual")
      .then((r) => r.json())
      .then(async (d) => {
        const top = d.rows?.[0];
        if (!top) {
          setEmpty(true);
          return;
        }
        // Pull the full profile to get neutrality too.
        const prof = await fetch(`/api/channels/${top.channel.id}`).then((r) => r.json());
        const neu = (prof.radar ?? []).find((x: any) => x.dimension?.key === "neutrality");
        setFeat({
          id: top.channel.id,
          name: top.channel.name,
          medium: top.channel.medium,
          content_type: top.channel.content_type,
          factual: top.rating,
          factualSigma: top.sigma,
          neutrality: neu?.rating ?? 0,
        });
      })
      .catch(() => setEmpty(true));
  }, []);

  const sz = SIZES[size];
  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 13px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: active ? "#fff" : "var(--muted)",
    background: active ? "var(--accent)" : "transparent",
  });

  const stats = feat
    ? [
        { value: feat.factual.toFixed(1), label: "Factual" },
        { value: feat.neutrality.toFixed(1), label: "Neutrality" },
        { value: "±" + feat.factualSigma.toFixed(1), label: "confidence" },
      ]
    : [];

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(20px,4vw,44px) clamp(15px,4vw,40px) 90px" }}>
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accent)" }}>Share</div>
      <h1 style={{ fontFamily: "Newsreader,Georgia,serif", fontWeight: 500, fontSize: "clamp(26px,4vw,36px)", lineHeight: 1.08, margin: "0 0 10px", letterSpacing: "-.01em" }}>
        This week&apos;s most-trusted channel
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 22px", maxWidth: "58ch" }}>
        Auto-generated cards, sized for where people actually share. Same objective tone everywhere.
      </p>

      {empty ? (
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          No ranked channel yet — once the community votes and ratings recompute, the top channel appears here as a ready-to-post card.
        </p>
      ) : !feat ? (
        <p style={{ fontSize: 14, color: "var(--muted)" }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 3, padding: 3, border: "1px solid var(--line)", borderRadius: 11, background: "var(--surface)", width: "max-content", marginBottom: 28, flexWrap: "wrap" }}>
            {(["wa", "x", "story"] as SizeKey[]).map((k) => (
              <button key={k} onClick={() => setSize(k)} style={pill(size === k)}>
                {k === "wa" ? "WhatsApp" : k === "x" ? "X" : "IG story"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 30px" }}>
            <div style={{ position: "relative", width: sz.w, height: sz.h, borderRadius: 18, overflow: "hidden", boxShadow: "0 14px 44px rgba(20,22,40,.28)" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg,var(--accent) 0%,color-mix(in srgb,var(--accent) 60%,#0c0d12) 100%)" }} />
              <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: sz.pad, color: "#fff" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid var(--accent)" }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-.02em" }}>PressRank</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.78 }}>Most trusted · this week</span>
                </div>
                <div style={{ marginTop: "auto" }}>
                  <div style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", opacity: 0.8 }}>No. 1 · Factual accuracy</div>
                  <div style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontWeight: 500, fontSize: sz.name, lineHeight: 1.04, marginTop: 6 }}>{feat.name}</div>
                  <div style={{ fontSize: 14, opacity: 0.85, marginTop: 8 }}>{[feat.medium, feat.content_type].filter(Boolean).join(" · ")}</div>
                  <div style={{ display: "flex", gap: 22, marginTop: 18, flexWrap: "wrap" }}>
                    {stats.map((st) => (
                      <div key={st.label}>
                        <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, fontSize: 26 }}>{st.value}</div>
                        <div style={{ fontSize: 11.5, opacity: 0.8 }}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.22)", fontSize: 11.5, opacity: 0.78, lineHeight: 1.45 }}>
                  Blind-judged sample of statements — a community read, not a verdict. pressrank.app
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", fontSize: 12.5, color: "var(--muted)" }}>{sz.label} · ready to post to WhatsApp, X &amp; Instagram</div>
        </>
      )}
    </main>
  );
}
