"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/ui/useAuth";

interface ArenaStatement {
  id: string;
  text: string;
  context: string | null;
}
interface Slate {
  slate_id: string;
  kind: "topk" | "pairwise";
  max_pick: number;
  question: string;
  dimension: { key: string; label: string } | null;
  statements: ArenaStatement[];
}
interface RevealRow {
  statement_id: string;
  selected: boolean;
  channel: { id: string; name: string; medium: string; logo_url: string | null };
}

const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ArenaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [kind, setKind] = useState<"topk" | "pairwise">("topk");
  const [slate, setSlate] = useState<Slate | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [reveal, setReveal] = useState<RevealRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSlate = useCallback(async () => {
    setError(null);
    setReveal(null);
    setSelected([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/arena/next?kind=${kind}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No slate available yet.");
      setSlate(data);
    } catch (e) {
      setError((e as Error).message);
      setSlate(null);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    loadSlate();
  }, [loadSlate]);

  // Optional Cloudflare Turnstile widget (only when a site key is configured).
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    const id = "cf-turnstile-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }, []);

  const inReveal = reveal !== null;
  const max = slate?.max_pick ?? 3;

  function tap(id: string) {
    if (inReveal || !slate) return;
    setSelected((prev) => {
      if (max === 1) return prev[0] === id ? [] : [id];
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < max) return [...prev, id];
      return prev;
    });
  }

  async function submit() {
    if (!slate) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (selected.length === 0) return;
    setError(null);
    const token = (window as any).turnstile?.getResponse?.() ?? undefined;
    const res = await fetch("/api/arena/vote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slate_id: slate.slate_id,
        selected_statement_ids: selected,
        turnstile_token: token,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(res.status === 401 ? "Please log in to vote." : data.error || "Vote failed.");
      return;
    }
    setReveal(data.reveal);
  }

  const channelById = (id: string) =>
    reveal?.find((r) => r.statement_id === id)?.channel;
  const revealNames = selected
    .map((id) => channelById(id)?.name)
    .filter(Boolean) as string[];

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 13px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: active ? "#fff" : "var(--muted)",
    background: active ? "var(--accent)" : "transparent",
  });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(20px,5vw,52px) clamp(15px,4vw,28px) 90px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".13em", textTransform: "uppercase", color: "var(--accent)" }}>
            The Arena
          </span>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>· blind taste test</span>
        </div>
        <div style={{ display: "flex", gap: 3, padding: 3, border: "1px solid var(--line)", borderRadius: 10, background: "var(--surface)" }}>
          <button onClick={() => setKind("topk")} style={pill(kind === "topk")}>Rank top 3</button>
          <button onClick={() => setKind("pairwise")} style={pill(kind === "pairwise")}>Head to head</button>
        </div>
      </div>

      <h1 style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontWeight: 500, fontSize: "clamp(27px,5.2vw,40px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 14px" }}>
        {loading ? "Loading a fresh slate…" : slate?.question ?? "No slate available yet"}
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 26px", maxWidth: "54ch" }}>
        {kind === "pairwise"
          ? "Pick the one statement you’d trust more. The source — channel, medium, everything — is hidden until you vote."
          : `Pick up to ${max} statements you’d trust most. No logos, no names — the source is revealed only after you vote.`}
      </p>

      {error && (
        <p style={{ fontSize: 14, color: "#c0392b", marginBottom: 20 }}>{error}{" "}
          {error.includes("No slate") && (
            <span style={{ color: "var(--muted)" }}>Run the collection job, then come back.</span>
          )}
        </p>
      )}

      {inReveal && (
        <div style={{ animation: "prRise .4s ease both", display: "flex", gap: 13, alignItems: "flex-start", padding: "15px 17px", border: "1px solid var(--accent)", background: "var(--accent-soft)", borderRadius: 14, marginBottom: 22 }}>
          <div style={{ flex: "none", width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 }}>
            {selected.length}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>Sources revealed.</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--muted)" }}>
              {revealNames.length
                ? `You blind-picked ${revealNames.join(", ")}. Same statements, judged with no idea who said them.`
                : "Here’s who was behind each statement."}
            </div>
          </div>
        </div>
      )}

      {slate && (
        <div style={{ display: "grid", gridTemplateColumns: kind === "pairwise" ? "repeat(auto-fit,minmax(240px,1fr))" : "repeat(auto-fit,minmax(220px,1fr))", gap: 13 }}>
          {slate.statements.map((s, i) => {
            const idx = selected.indexOf(s.id);
            const picked = idx >= 0;
            const ch = channelById(s.id);
            const shell: React.CSSProperties = {
              position: "relative",
              textAlign: "left",
              padding: 0,
              background: "transparent",
              border: "none",
              minHeight: kind === "pairwise" ? 210 : 176,
              display: "block",
              width: "100%",
            };
            const baseFace: React.CSSProperties = {
              position: "relative",
              height: "100%",
              minHeight: "inherit",
              borderRadius: 15,
              padding: 18,
              display: "flex",
              flexDirection: "column",
            };
            if (!inReveal) {
              return (
                <button key={s.id} onClick={() => tap(s.id)} style={shell}>
                  <div style={{ ...baseFace, background: "var(--surface)", border: `1.5px solid ${picked ? "var(--accent)" : "var(--line)"}`, boxShadow: picked ? "0 0 0 3px var(--accent-soft)" : "none", transition: "border-color .15s,box-shadow .15s" }}>
                    {picked && (
                      <div style={{ position: "absolute", top: 13, right: 13, width: 25, height: 25, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, animation: "prPing .25s ease both" }}>
                        {idx + 1}
                      </div>
                    )}
                    <div style={{ fontFamily: "Inter,'Hind',sans-serif", fontSize: 16.5, lineHeight: 1.5, fontWeight: 450, letterSpacing: "-.005em" }}>
                      {s.text}
                    </div>
                    {s.context && (
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--muted)", marginTop: 10 }}>{s.context}</div>
                    )}
                    <div style={{ marginTop: "auto", paddingTop: 14, fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint)" }}>
                      Source hidden
                    </div>
                  </div>
                </button>
              );
            }
            return (
              <button key={s.id} onClick={() => ch && router.push(`/channel/${ch.id}`)} style={shell}>
                <div style={{ ...baseFace, background: picked ? "var(--accent-soft)" : "var(--surface)", border: `1.5px solid ${picked ? "var(--accent)" : "var(--line)"}`, transformOrigin: "center", animation: `prFlipIn .55s cubic-bezier(.4,.05,.2,1) ${i * 0.09}s both` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--accent)" }}>
                    {ch?.medium ?? "channel"}
                  </div>
                  <div style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontSize: 24, fontWeight: 500, lineHeight: 1.1, marginTop: 7 }}>
                    {ch?.name ?? "—"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6 }}>Tap to view profile →</div>
                  {picked ? (
                    <div style={{ marginTop: "auto", paddingTop: 14, display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600 }}>
                      ✓ You picked this
                    </div>
                  ) : (
                    <div style={{ marginTop: "auto", fontSize: 12, color: "var(--faint)" }}>Not picked</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 26, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {!inReveal && slate && (
          <>
            <button
              onClick={submit}
              style={{
                padding: "12px 22px",
                borderRadius: 11,
                fontWeight: 600,
                fontSize: 15,
                ...(user && selected.length === 0
                  ? { background: "var(--accent-soft)", color: "var(--faint)", cursor: "not-allowed" }
                  : { background: "var(--accent)", color: "#fff" }),
              }}
            >
              {!user ? "Log in to vote" : kind === "pairwise" ? "Reveal the source" : `Reveal ${selected.length || ""} source${selected.length === 1 ? "" : "s"}`.trim()}
            </button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              {!user
                ? "Reading is open to all. Voting keeps it one-person-one-ballot."
                : selected.length === 0
                ? "Select at least one to continue."
                : `${selected.length} of ${max} selected`}
            </span>
          </>
        )}
        {inReveal && (
          <>
            <button onClick={loadSlate} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Next slate →
            </button>
            <button onClick={() => router.push("/share")} style={{ padding: "12px 18px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 600, fontSize: 14 }}>
              Make a share card
            </button>
          </>
        )}
      </div>

      {inReveal && (
        <div style={{ marginTop: 30, border: "1px solid var(--line)", borderRadius: 18, overflow: "hidden", background: "var(--surface)", animation: "prRise .5s ease both" }}>
          <div style={{ padding: "22px 22px 18px", background: "linear-gradient(135deg,var(--accent) 0%,color-mix(in srgb,var(--accent) 72%, #111) 100%)", color: "#fff" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", opacity: 0.8 }}>My PressRank result</div>
            <div style={{ fontFamily: "Newsreader,Georgia,serif", fontSize: 23, fontWeight: 500, lineHeight: 1.2, marginTop: 8, maxWidth: "30ch" }}>
              I blind-judged the news. Sources were hidden until after I voted.
            </div>
          </div>
          <div style={{ padding: "18px 22px 22px" }}>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>The channels behind my top picks:</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {selected.map((id, i) => {
                const ch = channelById(id);
                return (
                  <div key={id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: "none", width: 30, height: 30, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>{i + 1}</div>
                    <div style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontSize: 17, fontWeight: 500 }}>{ch?.name ?? "—"}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{ch?.medium}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: 34, fontSize: 12, lineHeight: 1.6, color: "var(--faint)", maxWidth: "60ch" }}>
        Reading the Arena needs no account. Voting does, so each ballot is one person.
        Every channel is judged on the same blind yardstick.
      </p>
    </main>
  );
}
