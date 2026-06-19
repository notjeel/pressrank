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
  votesLeftWeek: number | null;
}

const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function ArenaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [kind, setKind] = useState<"topk" | "pairwise">("topk");
  const [slate, setSlate] = useState<Slate | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [votesLeft, setVotesLeft] = useState<number | null>(null);

  const loadSlate = useCallback(async () => {
    setError(null);
    setExhausted(false);
    setDone(false);
    setSelected([]);
    setLoading(true);
    try {
      const res = await fetch(`/api/arena/next?kind=${kind}`);
      const data = await res.json();
      if (!res.ok) {
        setExhausted(!!data.exhausted);
        if (typeof data.votesLeftWeek === "number") setVotesLeft(data.votesLeftWeek);
        throw new Error(data.error || "No slate available yet.");
      }
      setSlate(data);
      if (typeof data.votesLeftWeek === "number") setVotesLeft(data.votesLeftWeek);
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

  const max = slate?.max_pick ?? 3;

  function tap(id: string) {
    if (done || !slate) return;
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
      if (res.status === 429 && typeof data.votesLeftWeek === "number") {
        setVotesLeft(data.votesLeftWeek);
      }
      setError(
        res.status === 401
          ? "Please log in to vote."
          : data.error || "Vote failed."
      );
      return;
    }
    if (typeof data.votesLeftWeek === "number") setVotesLeft(data.votesLeftWeek);
    setDone(true);
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "7px 13px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: active ? "#fff" : "var(--muted)",
    background: active ? "var(--accent)" : "transparent",
  });

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "clamp(20px,5vw,52px) clamp(15px,4vw,28px) 90px" }}>
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

      {votesLeft !== null && (
        <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
          {votesLeft} vote{votesLeft === 1 ? "" : "s"} left this week.
        </p>
      )}

      <h1 style={{ fontFamily: "Newsreader,'Hind',Georgia,serif", fontWeight: 500, fontSize: "clamp(27px,5.2vw,40px)", lineHeight: 1.12, letterSpacing: "-.01em", margin: "0 0 14px" }}>
        {loading ? "Loading a fresh slate…" : done ? "Vote recorded." : slate?.question ?? "Nothing to vote on right now"}
      </h1>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: "var(--muted)", margin: "0 0 26px", maxWidth: "54ch" }}>
        {done
          ? "Your blind judgement is in. The sources stay anonymous — by design, no one (not even you) sees which channel said what. That's what keeps the ranking honest."
          : kind === "pairwise"
          ? "Pick the one statement you’d trust more. The source — channel, medium, everything — stays hidden, always."
          : `Pick up to ${max} statements you’d trust most. No logos, no names — sources are never revealed.`}
      </p>

      {error && !exhausted && (
        <p style={{ fontSize: 14, color: "#c0392b", marginBottom: 20 }}>{error}</p>
      )}

      {exhausted && (
        <div style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>You&apos;re all caught up 🎉</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            {error || "You've judged every available slate."} Fresh statements are
            collected automatically every day — come back tomorrow for more.
          </div>
        </div>
      )}

      {slate && !done && (
        <div style={{ display: "grid", gridTemplateColumns: kind === "pairwise" ? "repeat(auto-fit,minmax(240px,1fr))" : "repeat(auto-fit,minmax(220px,1fr))", gap: 13 }}>
          {slate.statements.map((s) => {
            const idx = selected.indexOf(s.id);
            const picked = idx >= 0;
            return (
              <button
                key={s.id}
                onClick={() => tap(s.id)}
                style={{ position: "relative", textAlign: "left", padding: 0, background: "transparent", border: "none", minHeight: kind === "pairwise" ? 210 : 176, display: "block", width: "100%" }}
              >
                <div style={{ position: "relative", height: "100%", minHeight: "inherit", borderRadius: 15, padding: 18, display: "flex", flexDirection: "column", background: "var(--surface)", border: `1.5px solid ${picked ? "var(--accent)" : "var(--line)"}`, boxShadow: picked ? "0 0 0 3px var(--accent-soft)" : "none", transition: "border-color .15s,box-shadow .15s" }}>
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
          })}
        </div>
      )}

      <div style={{ marginTop: 26, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {slate && !done && !exhausted && (
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
              {!user ? "Log in to vote" : "Submit blind vote"}
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
        {done && (
          <>
            <button onClick={loadSlate} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 15 }}>
              Next slate →
            </button>
            <button onClick={() => router.push("/leaderboard")} style={{ padding: "12px 18px", borderRadius: 11, border: "1px solid var(--line)", background: "var(--surface)", fontWeight: 600, fontSize: 14 }}>
              See the leaderboard
            </button>
          </>
        )}
        {exhausted && (
          <button onClick={() => router.push("/leaderboard")} style={{ padding: "12px 20px", borderRadius: 11, background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 15 }}>
            See the leaderboard
          </button>
        )}
      </div>

      <p style={{ marginTop: 34, fontSize: 12, lineHeight: 1.6, color: "var(--faint)", maxWidth: "60ch" }}>
        Reading the Arena needs no account. Voting does, so each ballot is one person.
        Every channel is judged on the same blind yardstick, and sources are never revealed.
      </p>
    </main>
  );
}
