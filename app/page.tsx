import Link from "next/link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface TopRating {
  rank: number;
  name: string;
  logo: string;
  medium: string;
  rating: number;
  n_statements: number;
}

export default async function HomePage() {
  // Fetch real statistics from Supabase (fallback to mock values if empty)
  let votesCount = 0;
  let channelsCount = 0;
  let usersCount = 0;
  let statementsCount = 0;

  let topFactual: TopRating[] = [];
  let topNeutrality: TopRating[] = [];
  let topSourcing: TopRating[] = [];
  let topNonSensational: TopRating[] = [];

  let compareA = { name: "Reuters", ratings: { 1: 43.0, 2: 41.7, 3: 45.5, 5: 42.9 } as Record<number, number> };
  let compareB = { name: "Dhruv Rathee", ratings: { 1: 38.8, 2: 41.2, 3: 40.0, 5: 40.6 } as Record<number, number> };

  try {
    const supabase = createSupabaseAdminClient();

    const [votesRes, channelsRes, usersRes, statementsRes] = await Promise.all([
      supabase.from("votes").select("id", { count: "exact", head: true }),
      supabase.from("channels").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("statements").select("id", { count: "exact", head: true }),
    ]);

    votesCount = votesRes.count ?? 0;
    channelsCount = channelsRes.count ?? 0;
    usersCount = usersRes.count ?? 0;
    statementsCount = statementsRes.count ?? 0;

    // Fetch top 3 channels for Factual (dim_id = 2)
    const { data: factualData } = await supabase
      .from("channel_ratings")
      .select("rating, n_statements, channel:channels(name, logo_url, medium)")
      .eq("dimension_id", 2)
      .eq("ranked", true)
      .order("rating", { ascending: false })
      .limit(3);

    topFactual = (factualData ?? []).map((r: any, idx) => ({
      rank: idx + 1,
      name: r.channel?.name ?? "Unknown",
      logo: r.channel?.logo_url ?? "",
      medium: r.channel?.medium ?? "youtube",
      rating: Math.round(r.rating),
      n_statements: r.n_statements,
    }));

    // Fetch top 3 channels for Neutrality (dim_id = 1)
    const { data: neutralityData } = await supabase
      .from("channel_ratings")
      .select("rating, n_statements, channel:channels(name, logo_url, medium)")
      .eq("dimension_id", 1)
      .eq("ranked", true)
      .order("rating", { ascending: false })
      .limit(3);

    topNeutrality = (neutralityData ?? []).map((r: any, idx) => ({
      rank: idx + 1,
      name: r.channel?.name ?? "Unknown",
      logo: r.channel?.logo_url ?? "",
      medium: r.channel?.medium ?? "youtube",
      rating: Math.round(r.rating),
      n_statements: r.n_statements,
    }));

    // Fetch top 3 channels for Sourcing (dim_id = 3)
    const { data: sourcingData } = await supabase
      .from("channel_ratings")
      .select("rating, n_statements, channel:channels(name, logo_url, medium)")
      .eq("dimension_id", 3)
      .eq("ranked", true)
      .order("rating", { ascending: false })
      .limit(3);

    topSourcing = (sourcingData ?? []).map((r: any, idx) => ({
      rank: idx + 1,
      name: r.channel?.name ?? "Unknown",
      logo: r.channel?.logo_url ?? "",
      medium: r.channel?.medium ?? "youtube",
      rating: Math.round(r.rating),
      n_statements: r.n_statements,
    }));

    // Fetch top 3 channels for Non-sensational (dim_id = 5)
    const { data: nonSensationalData } = await supabase
      .from("channel_ratings")
      .select("rating, n_statements, channel:channels(name, logo_url, medium)")
      .eq("dimension_id", 5)
      .eq("ranked", true)
      .order("rating", { ascending: false })
      .limit(3);

    topNonSensational = (nonSensationalData ?? []).map((r: any, idx) => ({
      rank: idx + 1,
      name: r.channel?.name ?? "Unknown",
      logo: r.channel?.logo_url ?? "",
      medium: r.channel?.medium ?? "youtube",
      rating: Math.round(r.rating),
      n_statements: r.n_statements,
    }));

    // Fetch comparison ratings dynamically
    const { data: compareChannels } = await supabase
      .from("channels")
      .select("id, name")
      .in("name", ["Reuters", "Dhruv Rathee"]);

    if (compareChannels && compareChannels.length >= 2) {
      const idA = compareChannels.find((c: any) => c.name === "Reuters")?.id;
      const idB = compareChannels.find((c: any) => c.name === "Dhruv Rathee")?.id;
      if (idA && idB) {
        const { data: ratingsData } = await supabase
          .from("channel_ratings")
          .select("channel_id, dimension_id, rating")
          .in("channel_id", [idA, idB]);

        if (ratingsData) {
          compareA.ratings = {};
          compareB.ratings = {};
          for (const r of ratingsData) {
            if (r.channel_id === idA) {
              compareA.ratings[r.dimension_id] = r.rating;
            } else if (r.channel_id === idB) {
              compareB.ratings[r.dimension_id] = r.rating;
            }
          }
        }
      }
    }
  } catch {
    // Database fallback — show zeros if DB is unreachable
  }

  const factualList = topFactual;
  const neutralityList = topNeutrality;
  const sourcingList = topSourcing;
  const nonSensationalList = topNonSensational;

  // Custom inline styles for landing page (fully wired to CSS vars)
  const sectionStyle: React.CSSProperties = {
    padding: "80px clamp(15px,5vw,40px)",
    maxWidth: 1180,
    margin: "0 auto",
  };

  const statCardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: "20px 24px",
    textAlign: "center",
    flex: 1,
    minWidth: 140,
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: 24,
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 30,
    background: "var(--accent-soft)",
    border: "1px solid var(--line)",
    color: "var(--accent)",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    marginBottom: 20,
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)", overflowX: "hidden", transition: "background 0.15s, color 0.15s" }}>
      {/* 1. HERO SECTION */}
      <section style={{ ...sectionStyle, padding: "90px clamp(15px,5vw,40px) 70px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <div style={badgeStyle}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
              PressRank Benchmark
            </div>
            <h1
              style={{
                fontFamily: "Newsreader, Georgia, serif",
                fontSize: "clamp(34px, 5.5vw, 54px)",
                lineHeight: 1.08,
                fontWeight: 500,
                letterSpacing: "-.02em",
                margin: "0 0 18px",
                color: "var(--fg)",
              }}
            >
              The Independent Benchmark for{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                News Credibility
              </span>
            </h1>
            <p
              style={{
                fontSize: 16.5,
                lineHeight: 1.6,
                color: "var(--muted)",
                marginBottom: 36,
                maxWidth: "52ch",
              }}
            >
              The same transcripts and captions run through every reader. Blind community votes decide the winners, and live ELO rankings keep them honest. No paid placement, no brand bias.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 38 }}>
              <Link
                href="/arena"
                style={{
                  padding: "13px 26px",
                  borderRadius: 10,
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none",
                  display: "inline-block",
                  transition: "opacity 0.15s",
                }}
              >
                Start blind vote &rarr;
              </Link>
              <Link
                href="/leaderboard"
                style={{
                  padding: "13px 26px",
                  borderRadius: 10,
                  background: "transparent",
                  color: "var(--fg)",
                  border: "1px solid var(--line)",
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none",
                  display: "inline-block",
                  transition: "background 0.15s",
                }}
              >
                See leaderboard
              </Link>
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={statCardStyle}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", fontFamily: "monospace" }}>
                  {votesCount.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>
                  Votes Cast
                </div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", fontFamily: "monospace" }}>
                  {channelsCount}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>
                  Channels
                </div>
              </div>
              <div style={statCardStyle}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--fg)", fontFamily: "monospace" }}>
                  {usersCount.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginTop: 4 }}>
                  Voter Raters
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Mockup (Flip Reveal Card) */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: "100%",
                maxWidth: 420,
                background: "linear-gradient(135deg, var(--grid) 0%, var(--surface) 100%)",
                borderRadius: 20,
                border: "1px solid var(--line)",
                padding: 24,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>
                  Blind Slate Preview
                </span>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>
                  How it looks
                </span>
              </div>

              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--fg)", fontStyle: "italic", marginBottom: 12 }}>
                  &quot;Statement from a channel you may follow — stripped of all branding, logos, and identity.&quot;
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Source Hidden
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent2)", fontWeight: 600 }}>
                    Your blind vote decides
                  </span>
                </div>
              </div>

              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 15, lineHeight: 1.5, color: "var(--fg)", fontStyle: "italic", marginBottom: 12 }}>
                  &quot;Another statement from a completely different outlet — can you tell which is which?&quot;
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                    Source Hidden
                  </span>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                    Pick the most credible
                  </span>
                </div>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--line)",
                  paddingTop: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Sources stay hidden — always.</span>
                <span style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 600 }}>Try the Arena &rarr;</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TOP PERFORMERS RIGHT NOW */}
      <section style={{ ...sectionStyle, borderTop: "1px solid var(--line)", paddingTop: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 500,
              color: "var(--fg)",
              margin: "0 0 10px",
            }}
          >
            Top Performers Right Now
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--muted)", maxWidth: "60ch", margin: "0 auto" }}>
            Ranked by community ELO across our core dimensions, updated continuously.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 44 }}>
          {/* Box 1: Factual precision */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Factual Precision</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Verifiable facts over rumors</div>
              </div>
            </div>
            {factualList.length === 0 ? (
              <div style={{ padding: "18px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Not enough votes yet — cast some in the Arena.</div>
            ) : factualList.map((ch, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < 2 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f1c40f" : idx === 1 ? "var(--faint)" : "#e67e22", width: 14 }}>{ch.rank}</span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: "var(--fg)" }}>{ch.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{ch.medium}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{ch.rating}</span>
              </div>
            ))}
          </div>

          {/* Box 2: Neutrality */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Neutrality</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Objective, non-loaded tone</div>
              </div>
            </div>
            {neutralityList.length === 0 ? (
              <div style={{ padding: "18px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Not enough votes yet — cast some in the Arena.</div>
            ) : neutralityList.map((ch, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < 2 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f1c40f" : idx === 1 ? "var(--faint)" : "#e67e22", width: 14 }}>{ch.rank}</span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: "var(--fg)" }}>{ch.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{ch.medium}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{ch.rating}</span>
              </div>
            ))}
          </div>

          {/* Box 3: Sourcing */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5v-15a2.5 2.5 0 0 1 2.5-2.5H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" /><path d="M6 6h10" /><path d="M6 10h10" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Sourcing</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Specific, verifiable sources</div>
              </div>
            </div>
            {sourcingList.length === 0 ? (
              <div style={{ padding: "18px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Not enough votes yet — cast some in the Arena.</div>
            ) : sourcingList.map((ch, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < 2 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f1c40f" : idx === 1 ? "var(--faint)" : "#e67e22", width: 14 }}>{ch.rank}</span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: "var(--fg)" }}>{ch.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{ch.medium}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{ch.rating}</span>
              </div>
            ))}
          </div>

          {/* Box 4: Non-sensational */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)" }}>Non-sensational</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Least sensational phrasing</div>
              </div>
            </div>
            {nonSensationalList.length === 0 ? (
              <div style={{ padding: "18px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Not enough votes yet — cast some in the Arena.</div>
            ) : nonSensationalList.map((ch, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: idx < 2 ? "1px solid var(--line)" : "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: idx === 0 ? "#f1c40f" : idx === 1 ? "var(--faint)" : "#e67e22", width: 14 }}>{ch.rank}</span>
                <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: "var(--fg)" }}>{ch.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{ch.medium}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>{ch.rating}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
          <Link
            href="/leaderboard"
            style={{
              padding: "11px 22px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            See full leaderboard &rarr;
          </Link>
          <Link
            href="/methodology"
            style={{
              padding: "11px 22px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--fg)",
              border: "1px solid var(--line)",
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            How it works
          </Link>
        </div>
      </section>

      {/* 3. VOTE BLINDLY, HELP BUILD THE BENCHMARK */}
      <section style={{ ...sectionStyle, borderTop: "1px solid var(--line)", paddingTop: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 54 }}>
          <h2
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 500,
              color: "var(--fg)",
              margin: "0 0 10px",
            }}
          >
            Vote Blindly, Help Build the Benchmark
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--muted)", maxWidth: "60ch", margin: "0 auto" }}>
            The statements you read are the only thing you see. Identity, branding, and graphics are completely stripped.
          </p>
        </div>

        {/* Step 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center", marginBottom: 70 }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", marginBottom: 12 }}>01</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)", marginBottom: 12 }}>We collect transcripts</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
              Every day we harvest recent coverage programmatically via official platform APIs. We pull verbatim transcripts and captions. No manual user submissions, ensuring representative, unbiased sampling.
            </p>
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 16,
              padding: 20,
              fontFamily: "monospace",
              fontSize: 12.5,
              color: "var(--accent2)",
              overflowX: "auto",
            }}
          >
            {`$ youtube-api fetch --recent-uploads
> Fetching NDTV, Aaj Tak, Ravish Kumar...
> Extracted 12 video transcripts.
> Generating SHA-256 content-hashes.
> Status: 100% Secure & Pinned.`}
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center", marginBottom: 70 }}>
          <div style={{ order: 2 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", marginBottom: 12 }}>02</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)", marginBottom: 12 }}>You vote blindly</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
              You review a randomized slate of anonymous statements. Pick the statements that best satisfy the quality dimension (e.g., Neutrality). Brand identities and logos are never revealed to voters, keeping judgments completely unbiased.
            </p>
          </div>
          <div style={{ order: 1, display: "flex", gap: 12, flexDirection: "column" }}>
            <div style={{ ...cardStyle, border: "1.5px solid var(--accent)", background: "var(--accent-soft)" }}>
              <div style={{ fontSize: 13, color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>Statement A (Factual)</div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontStyle: "italic" }}>&quot;The agency confirmed 3,000 cases of vaccine distribution delays across five provinces.&quot;</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Statement B (Speculative)</div>
              <div style={{ fontSize: 14, color: "var(--fg)", fontStyle: "italic" }}>&quot;Unsubstantiated reports point to complete structural failures in the distribution grid.&quot;</div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "var(--accent)", fontFamily: "monospace", marginBottom: 12 }}>03</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: "var(--fg)", marginBottom: 12 }}>Every vote refines the leaderboard</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
              Your vote updates the latent ELO score of the underlying outlet. The leaderboard recalculates in real-time using Bayesian shrinkage, ensuring that small sample sizes don&apos;t skew the ratings.
            </p>
          </div>
          <div>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 10, fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>
                <span>OUTLET</span>
                <span>RATING</span>
                <span>CONFIDENCE</span>
              </div>
              {factualList.length > 0 ? factualList.slice(0, 2).map((ch, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 13.5, color: "var(--fg)", fontWeight: 600 }}>
                  <span>{ch.name}</span>
                  <span>{ch.rating} pts</span>
                  <span style={{ color: "var(--accent2)" }}>Live</span>
                </div>
              )) : (
                <div style={{ padding: "14px 0", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>Ratings appear as votes come in.</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMPARE NAMED */}
      <section style={{ ...sectionStyle, borderTop: "1px solid var(--line)", paddingTop: 80 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontSize: "clamp(28px, 4vw, 36px)",
              fontWeight: 500,
              color: "var(--fg)",
              margin: "0 0 10px",
            }}
          >
            Know the Contenders? Compare Them Named
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--muted)", maxWidth: "60ch", margin: "0 auto 24px" }}>
            Skip the blind arena when you want to compare specific outlets. Pick any two channels, overlay their radar charts, and review dimension-by-dimension deltas.
          </p>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <Link
              href="/compare"
              style={{
                padding: "11px 22px",
                borderRadius: 8,
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14.5,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Open Compare page &rarr;
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
          <div>
            <ul style={{ paddingLeft: 20, color: "var(--fg)", fontSize: 14.5, lineHeight: 1.8, marginBottom: 30, maxWidth: "45ch", margin: "0 auto" }}>
              <li>Compare TV broadcasters head-to-head with digital creators.</li>
              <li>Inspect statement-level details of each outlet side-by-side.</li>
              <li>Confidence whiskers indicate rating data density.</li>
            </ul>
          </div>

          <div style={{ position: "relative", maxWidth: 420, margin: "0 auto", width: "100%" }}>
            <div
              style={{
                border: "1px solid var(--line)",
                background: "var(--surface)",
                borderRadius: 20,
                padding: 24,
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#ea4335" }}>{compareA.name}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>vs</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{compareB.name}</span>
              </div>

              {/* Dynamic comparison sliders */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { name: "Factual Precision", id: 2 },
                  { name: "Neutrality", id: 1 },
                  { name: "Sourcing", id: 3 },
                  { name: "Non-sensational", id: 5 }
                ].map((dim) => {
                  const ratingA = compareA.ratings[dim.id] ?? 40.0;
                  const ratingB = compareB.ratings[dim.id] ?? 40.0;
                  const posA = `${ratingA}%`;
                  const posB = `${ratingB}%`;
                  return (
                    <div key={dim.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)" }}>{dim.name}</span>
                        <span style={{ fontWeight: 600, color: "var(--fg)", fontSize: 11 }}>
                          {ratingA.toFixed(1)} vs {ratingB.toFixed(1)}
                        </span>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--bg)", position: "relative" }}>
                        <div style={{ position: "absolute", left: `calc(${posA} - 5px)`, width: 10, height: 10, top: -2, borderRadius: "50%", background: "#ea4335", zIndex: 2 }} />
                        <div style={{ position: "absolute", left: `calc(${posB} - 5px)`, width: 10, height: 10, top: -2, borderRadius: "50%", background: "var(--accent)", zIndex: 1 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SIGN IN / CTA BOX */}
      <section style={{ ...sectionStyle, paddingBottom: 100 }}>
        <div
          style={{
            background: "linear-gradient(135deg, var(--grid) 0%, var(--surface) 100%)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            padding: "50px 30px",
            textAlign: "center",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
          }}
        >
          <h2
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontSize: "clamp(26px, 4.5vw, 34px)",
              fontWeight: 500,
              color: "var(--fg)",
              margin: "0 0 12px",
            }}
          >
            Sign in to Vote, Save History, and Review
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--muted)", maxWidth: "50ch", margin: "0 auto 30px" }}>
            We use secure magic links and Google OAuth. No passwords needed.
          </p>

          <Link
            href="/login"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "13px 26px",
              borderRadius: 10,
              background: "var(--accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Sign in with Google</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
