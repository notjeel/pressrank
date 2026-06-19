"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/lib/ui/theme";
import { DIMS } from "@/lib/ui/dims";
import { Radar, type RadarSeries } from "@/components/charts/Radar";
import { CmpBar } from "@/components/charts/Bars";

interface ChannelLite {
  id: string;
  name: string;
  medium: string;
}
interface Loaded {
  id: string;
  name: string;
  values: Record<string, { rating: number; sigma: number; provisional: boolean }>;
}

function CompareInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { pal } = useTheme();
  const colors = [pal.accent, pal.accent2, "#b4882f"];

  const initial = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const [ids, setIds] = useState<string[]>(initial);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [all, setAll] = useState<ChannelLite[]>([]);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => setAll(d.channels ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all(
      ids.map((id) =>
        fetch(`/api/channels/${id}`)
          .then((r) => r.json())
          .then((d) => {
            const values: Loaded["values"] = {};
            for (const dim of DIMS) {
              const row = (d.radar ?? []).find((x: any) => x.dimension?.key === dim.key);
              values[dim.key] = row
                ? { rating: row.rating, sigma: row.sigma, provisional: !row.ranked }
                : { rating: 0, sigma: 0, provisional: true };
            }
            return { id, name: d.channel?.name ?? "—", values };
          })
          .catch(() => null)
      )
    ).then((res) => setLoaded(res.filter(Boolean) as Loaded[]));
  }, [ids]);

  const series: RadarSeries[] = loaded.map((l, i) => ({ color: colors[i % 3], values: l.values }));
  const addable = all.filter((c) => !ids.includes(c.id));

  const remove = (id: string) => {
    const next = ids.filter((x) => x !== id);
    setIds(next);
    router.replace(`/compare?ids=${next.join(",")}`, { scroll: false });
  };
  const add = (id: string) => {
    if (!id || ids.includes(id) || ids.length >= 3) return;
    const next = [...ids, id];
    setIds(next);
    router.replace(`/compare?ids=${next.join(",")}`, { scroll: false });
  };

  const selStyle: React.CSSProperties = {
    padding: "8px 11px",
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--fg)",
    fontSize: 13,
    fontWeight: 500,
  };

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "clamp(20px,4vw,44px) clamp(15px,4vw,40px) 90px", textAlign: "center" }}>
      <div style={{ marginBottom: 8, fontSize: 11, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accent)" }}>Compare</div>
      <h1 style={{ fontFamily: "Newsreader,Georgia,serif", fontWeight: 500, fontSize: "clamp(26px,4vw,36px)", lineHeight: 1.08, margin: "0 auto 10px", letterSpacing: "-.01em", maxWidth: "34ch" }}>
        A TV anchor and an independent creator, on the same yardstick
      </h1>
      <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "0 auto 24px", maxWidth: "60ch" }}>
        Overlay any channels and read the gaps dimension by dimension.
      </p>

      <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        {loaded.map((l, i) => (
          <span key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 8px 7px 13px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 600, fontSize: 13.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors[i % 3] }} />
            {l.name}
            <button onClick={() => remove(l.id)} style={{ width: 18, height: 18, borderRadius: "50%", color: "var(--muted)", fontSize: 14, lineHeight: 1 }}>×</button>
          </span>
        ))}
        <select value="__" onChange={(e) => { add(e.target.value); e.target.value = "__"; }} style={selStyle}>
          <option value="__">{ids.length >= 3 ? "Max 3 channels" : "+ Add channel"}</option>
          {addable.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loaded.length === 0 ? (
        <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 auto" }}>Add channels above to compare their trust profiles.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 26, textAlign: "left" }}>
          <div style={{ border: "1px solid var(--line)", borderRadius: 16, background: "var(--surface)", padding: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ alignSelf: "flex-start", fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Overlaid profiles</div>
            <Radar series={series} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Dimension by dimension</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {DIMS.map((d) => {
                const vals = loaded.map((l) => l.values[d.key]?.rating ?? 0);
                const delta = Math.round(Math.max(...vals) - Math.min(...vals));
                return (
                  <div key={d.key}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.short}</span>
                      <span style={{ fontSize: 12, color: "var(--muted)" }}>Δ {delta} pts</span>
                    </div>
                    <CmpBar rows={loaded.map((l, i) => ({ color: colors[i % 3], v: l.values[d.key]?.rating ?? 0 }))} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<main style={{ padding: 44 }}>Loading…</main>}>
      <CompareInner />
    </Suspense>
  );
}
