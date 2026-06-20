"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DIMS } from "@/lib/ui/dims";
import { Scatter, type ScatterPoint } from "@/components/charts/Scatter";
import { MiniBar } from "@/components/charts/Bars";

interface LbRow {
  channel: {
    id: string;
    name: string;
    medium: string;
    content_type: string | null;
    language: string | null;
    verified: boolean;
  };
  rating: number;
  sigma: number;
  n_statements: number;
}

interface ChannelLite {
  medium: string;
  content_type: string | null;
  language: string | null;
}

function LeaderboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dim = searchParams.get("dimension") || "overall";
  const [medium, setMedium] = useState("all");
  const [type, setType] = useState("all");
  const [lang, setLang] = useState("all");

  const setDim = (newDim: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dimension", newDim);
    router.replace(`/leaderboard?${params.toString()}`, { scroll: false });
  };

  const [rows, setRows] = useState<LbRow[]>([]);
  const [bc, setBc] = useState<ScatterPoint[]>([]);
  const [rt, setRt] = useState<ScatterPoint[]>([]);
  const [allChannels, setAllChannels] = useState<ChannelLite[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter options derived from the full channel set.
  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => setAllChannels(d.channels ?? []))
      .catch(() => {});
  }, []);

  // Scatter maps (independent of the table's dimension/filters).
  useEffect(() => {
    Promise.all([
      fetch("/api/scatter?x=neutrality&y=factual").then((r) => r.json()),
      fetch("/api/scatter?x=reach&y=factual").then((r) => r.json()),
    ])
      .then(([a, b]) => {
        setBc(a.points ?? []);
        setRt(b.points ?? []);
      })
      .catch(() => {});
  }, []);

  // Table.
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ dimension: dim });
    if (medium !== "all") qs.set("medium", medium);
    if (type !== "all") qs.set("content_type", type);
    if (lang !== "all") qs.set("lang", lang);
    fetch(`/api/leaderboard?${qs}`)
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [dim, medium, type, lang]);

  const uniq = (key: keyof ChannelLite) => [
    "all",
    ...Array.from(new Set(allChannels.map((c) => c[key]).filter(Boolean))) as string[],
  ];

  const dimLabel = dim === "overall" ? "Overall" : (DIMS.find((d) => d.key === dim)?.label ?? dim);

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 13px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: active ? "#fff" : "var(--muted)",
    background: active ? "var(--accent)" : "transparent",
  });
  const selStyle: React.CSSProperties = {
    padding: "8px 11px",
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--fg)",
    fontSize: 13,
    fontWeight: 500,
  };
  const gridCols = "34px 1.6fr 1fr 1.5fr 90px";

  const cardChrome: React.CSSProperties = {
    border: "1px solid var(--line)",
    borderRadius: 16,
    background: "var(--surface)",
    padding: "18px 18px 8px",
  };

  const Filter = ({ label, value, set, opts }: { label: string; value: string; set: (v: string) => void; opts: string[] }) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)" }}>
      {label}
      <select value={value} onChange={(e) => set(e.target.value)} style={selStyle}>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o === "all" ? "All" : o}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(20px,4vw,44px) clamp(15px,4vw,40px) 90px", textAlign: "center" }}>
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accent)" }}>
        Leaderboard
      </div>
      <h1 style={{ fontFamily: "Newsreader,Georgia,serif", fontWeight: 500, fontSize: "clamp(26px,4vw,38px)", lineHeight: 1.1, margin: "0 auto 10px", letterSpacing: "-.01em", maxWidth: "30ch" }}>
        Who earns trust — and who just has reach
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "0 auto 30px", maxWidth: "62ch" }}>
        Every point is a channel, scored from a blind-judged sample of its statements. Position is the community&apos;s read on quality — not a verdict.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(330px,1fr))", gap: 20, marginBottom: 38 }}>
        <div style={cardChrome}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Bias × Credibility</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 6px" }}>Neutrality (→) against factual accuracy (↑)</div>
          {bc.length ? <Scatter points={bc} variant="bc" /> : <EmptyChart />}
        </div>
        <div style={cardChrome}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Reach × Trust</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", margin: "3px 0 6px" }}>Audience size (→) against factual accuracy (↑)</div>
          {rt.length ? <Scatter points={rt} variant="rt" /> : <EmptyChart />}
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", justifyContent: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>Rank by</div>
          <div style={{ display: "flex", gap: 2, padding: 3, border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)", flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={() => setDim("overall")} style={pill(dim === "overall")}>
              Overall
            </button>
            {DIMS.map((d) => (
              <button key={d.key} onClick={() => setDim(d.key)} style={pill(dim === d.key)}>
                {d.short}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Filter label="Medium" value={medium} set={setMedium} opts={uniq("medium")} />
          <Filter label="Type" value={type} set={setType} opts={uniq("content_type")} />
          <Filter label="Language" value={lang} set={setLang} opts={uniq("language")} />
        </div>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", overflow: "hidden", textAlign: "left" }}>
        <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 10, padding: "12px 18px", borderBottom: "1px solid var(--line)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>
          <div>#</div>
          <div>Channel</div>
          <div>Medium</div>
          <div>{dimLabel} · ±σ</div>
          <div style={{ textAlign: "right" }}>Sample</div>
        </div>

        {loading ? (
          <div style={{ padding: "28px 18px", fontSize: 14, color: "var(--muted)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "28px 18px", fontSize: 14, color: "var(--muted)" }}>
            No ranked channels for this filter yet. Channels appear once enough blind votes
            accumulate — cast some in the <span style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => router.push("/arena")}>Arena</span>, then recompute.
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.channel.id}
              className="pr-row"
              onClick={() => router.push(`/channel/${r.channel.id}`)}
              style={{ display: "grid", gridTemplateColumns: gridCols, gap: 10, padding: "14px 18px", borderBottom: "1px solid var(--grid)", alignItems: "center", cursor: "pointer" }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>{i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 15, letterSpacing: "-.01em" }}>
                  {r.channel.name}
                  {r.channel.verified && (
                    <span style={{ flex: "none", width: 14, height: 14, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>✓</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {[r.channel.content_type, r.channel.language].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)" }}>{r.channel.medium}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 16, width: 34 }}>{r.rating.toFixed(1)}</div>
                <div style={{ flex: 1, minWidth: 60 }}>
                  <MiniBar rating={r.rating} sigma={r.sigma} />
                </div>
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontSize: 13, color: "var(--muted)" }}>{r.n_statements}·n</div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<main style={{ padding: 44, textAlign: "center", color: "var(--muted)" }}>Loading…</main>}>
      <LeaderboardInner />
    </Suspense>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--faint)", textAlign: "center", padding: 16 }}>
      No rated channels yet — the map fills in as votes come in.
    </div>
  );
}
