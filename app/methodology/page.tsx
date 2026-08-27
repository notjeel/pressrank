"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MethodologyPage() {
  const router = useRouter();

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 14,
    padding: "20px clamp(15px,4vw,24px)",
    marginBottom: 24,
  };

  const codeBlockStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 12,
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 1.5,
    overflowX: "auto",
    margin: "12px 0",
    color: "var(--fg)",
  };

  const dimItemStyle: React.CSSProperties = {
    borderBottom: "1px solid var(--grid)",
    padding: "12px 0",
  };

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "clamp(20px,5vw,52px) clamp(15px,4vw,28px) 90px",
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".13em",
            textTransform: "uppercase",
            color: "var(--accent)",
          }}
        >
          Methodology
        </span>
      </div>

      <h1
        style={{
          fontFamily: "Newsreader, 'Hind', Georgia, serif",
          fontWeight: 500,
          fontSize: "clamp(28px,5vw,40px)",
          lineHeight: 1.15,
          letterSpacing: "-.015em",
          margin: "0 0 16px",
        }}
      >
        How PressRank Measures Credibility
      </h1>

      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--muted)",
          margin: "0 0 32px",
        }}
      >
        PressRank uses a blind, community-driven, algorithmically computed framework to rank news channels. By stripping outlets of their branding and letting people judge anonymized coverage, the platform aims to produce an objective, manipulation-resistant credibility rating.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: "Newsreader, 'Hind', Georgia, serif",
            fontWeight: 500,
            fontSize: 24,
            marginBottom: 12,
          }}
        >
          1. The Five Quality Dimensions
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          Rather than compiling a single &quot;good/bad&quot; score, we rate channels across five key dimensions. In the Arena, voters answer low-temperature, comparative prompts:
        </p>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Factual Precision</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which is most precise about what is actually known vs. speculation?”</em> Measures factual grounding over speculation.
            </p>
          </div>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Neutrality</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which of these is worded most neutrally?”</em> Identifies tone objectivity and the absence of loaded words or editorial slants.
            </p>
          </div>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Sourcing</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which is best sourced / most specific about where it comes from?”</em> Evaluates if claims cite verifiable entities or anonymous rumors.
            </p>
          </div>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Non-Godi Media</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which statement is most independent of government narrative or establishment propaganda?”</em> Assesses how independent the reporting is from state narratives.
            </p>
          </div>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Non-sensational</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which is the least sensational / clickbait-driven?”</em> Rates the objective, measured editorial delivery of stories over high-alert headline grabbing.
            </p>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: "Newsreader, 'Hind', Georgia, serif",
            fontWeight: 500,
            fontSize: 24,
            marginBottom: 12,
          }}
        >
          2. Statement-Level Quality (Chance-Adjusted Shrinkage)
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          Each vote is a partial ranking: on a given slate, the statements the voter
          selected rank above the ones they did not. The raw signal is a selection
          rate — selections divided by exposures.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          A raw rate is not comparable across slates, though. Being picked once out
          of a head-to-head pair is a coin flip; being picked once out of a
          seven-statement slate where the voter chose three is a 43% shot. So for
          every impression we record what a <em>random</em> voter making the same
          number of picks would have scored, and each statement is measured against
          its own chance baseline rather than one global constant.
        </p>

        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>
            Statement Score
          </div>
          <div style={codeBlockStyle}>
            {`chance   = SUM(picked / slate_size) / exposures
p        = (selected + chance x 5) / (exposures + 5)
score    = OR / (1 + OR),
   where OR = [p / (1-p)] x [(1-chance) / chance]`}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            The shrinkage term (<strong>5</strong> pseudo-observations) stops a
            statement shown twice from outranking one shown 2,000 times. The odds
            ratio then rescales the result so that performing{" "}
            <strong>exactly at chance always lands on 0.50</strong>, whatever mix of
            slate sizes the statement happened to appear in. Above 0.50 means voters
            picked it more often than random selection would.
          </p>
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          Votes where the voter selected nothing are discarded rather than counted as
          exposures — an abstention carries no ranking information.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: "Newsreader, 'Hind', Georgia, serif",
            fontWeight: 500,
            fontSize: 24,
            marginBottom: 12,
          }}
        >
          3. Rolling Up to Channel Ratings
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          A channel&apos;s rating pools the evidence from all of its statements rather
          than averaging their scores. Averaging would let a statement judged twice
          count as much as one judged forty times; pooling the underlying counts
          weights each statement by how much evidence it actually carries.
        </p>

        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>
            Channel Rating
          </div>
          <div style={codeBlockStyle}>
            {`selected, expected, exposures
      = pooled over the channel's statements
        (each capped at 40 impressions)

chance = expected / exposures
p      = (selected + chance x 6) / (exposures + 6)
rating = 100 x OR / (1 + OR)`}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            The per-statement cap stops one excerpt that went viral in the Arena from
            becoming the channel&apos;s whole rating. <strong>50 is chance</strong>;
            the scale runs 0–100.
          </p>
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          The uncertainty band (<strong>±σ</strong>) is a real standard error, not a
          function of the statement count alone. It combines the binomial error on
          the pooled rate with how much the channel&apos;s own statements disagree
          with each other:
        </p>
        <div style={codeBlockStyle}>
          {`binomial = standard error of p, mapped onto the
           display scale through the same odds ratio
between  = stdev(statement scores) / sqrt(N)
sigma    = 100 x sqrt(binomial^2 + between^2)`}
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "16px 0" }}>
          The leaderboard is <strong>ordered by rating − 1.96σ</strong>, the
          conservative estimate, so a channel judged thirty times outranks one that
          got lucky twice. The figure displayed is still the rating itself.
        </p>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          <strong>Ranking thresholds.</strong> A channel qualifies for the public
          ranking once it clears a minimum statement count and a minimum number of
          judgements. Those bars are deliberately low while the database is young —
          otherwise the leaderboard would simply be empty — and tighten
          automatically as vote volume grows:
        </p>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 20 }}>
          <li>
            <strong>Under 2,500 votes</strong> — 1 statement, 2 judgements.
          </li>
          <li>
            <strong>2,500 to 10,000 votes</strong> — 2 statements, 4 judgements.
          </li>
          <li>
            <strong>Above 10,000 votes</strong> — 3 statements, 10 judgements.
          </li>
        </ul>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", margin: "16px 0 0" }}>
          Channels with real votes behind them that have not yet cleared the current
          bar are still shown, listed below the qualified ones and clearly marked{" "}
          <em>not yet qualified</em>. Hiding them would misrepresent how much the
          community has actually judged.
        </p>
      </section>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: "Newsreader, 'Hind', Georgia, serif",
            fontWeight: 500,
            fontSize: 24,
            marginBottom: 12,
          }}
        >
          4. Vote Weighting (Anti-Brigading)
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          To resist coordinated inauthentic behavior, vote farms, and brigading fanbases, votes are <strong>weighted, not simply counted</strong>. Every cast ballot has its weight computed server-side:
        </p>
        <div style={{ fontSize: 17, fontStyle: "italic", color: "var(--fg)", textAlign: "center", margin: "16px 0" }}>
          Weight = Identity Trust × Behavioral Authenticity × Recency
        </div>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, paddingLeft: 20 }}>
          <li>
            <strong>Identity Trust:</strong> Derived from account verification, hardware attestation layers, and account age. Freshly spawned accounts start with a weight near zero.
          </li>
          <li>
            <strong>Behavioral Authenticity:</strong> Collusion models monitor lockstep voting patterns, temporal burst activity, and network IP clustering to identify coordinate bot behavior.
          </li>
          <li>
            <strong>Recency:</strong> Emphasizes recent evaluations, ensuring stale historical ratings decay as channels alter their content styles.
          </li>
        </ul>
      </section>

      <div
        style={{
          borderTop: "1px solid var(--line)",
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          Want to know how we ensure complete privacy and anonymity?
        </span>
        <button
          onClick={() => router.push("/how-we-anonymize")}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          How we anonymize
        </button>
      </div>
    </main>
  );
}
