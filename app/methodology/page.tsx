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
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Fact vs. Opinion</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which best separates verifiable fact from opinion?”</em> Assesses how clearly commentary is distinguished from news reporting.
            </p>
          </div>
          <div style={dimItemStyle}>
            <strong style={{ fontSize: 15, color: "var(--fg)" }}>Calm (Non-sensational)</strong>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "4px 0 0" }}>
              <em>“Which is the least sensational / clickbait-driven?”</em> Rates the calm, editorial delivery of stories over high-alert headline grabbing.
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
          2. Statement-Level Quality (Bayesian Shrinkage)
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          Each vote is a partial ranking (the selected statements rank higher than the unselected statements on a given slate). To calculate a statement&apos;s latent score, we start with the selection rate (selections divided by exposures).
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          To prevent a statement shown only twice from scoring higher than one shown 2,000 times, we apply **Bayesian shrinkage** toward a global prior:
        </p>

        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>
            Statement Score Formula
          </div>
          <div style={{ fontSize: 18, fontStyle: "italic", margin: "14px 0", color: "var(--fg)", textAlign: "center" }}>
            Score = (Selected + (Global Prior × Prior Strength)) / (Exposures + Prior Strength)
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Where <strong>Global Prior = 0.40</strong> (the expected baseline rate) and <strong>Prior Strength = 5</strong> (the weight of pseudo-observations pulling low-exposure statements toward the mean).
          </p>
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          We also calculate a Wilson-style confidence half-width for each statement as an uncertainty proxy:
        </p>
        <div style={codeBlockStyle}>
          {`function wilsonHalfWidth(hits, trials) {
  if (trials <= 0) return 1;
  const p = hits / trials;
  return Math.min(1, 1.96 * Math.sqrt((p * (1 - p)) / trials) + 1 / trials);
}`}
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
          3. Rolling Up to Channel Ratings
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          To infer a channel&apos;s overall quality, we aggregate all of its harvested statements. We take the mean score of its statements and apply a second layer of sample-size shrinkage:
        </p>

        <div style={cardStyle}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: "var(--accent)" }}>
            Channel Rating Formula
          </div>
          <div style={{ fontSize: 18, fontStyle: "italic", margin: "14px 0", color: "var(--fg)", textAlign: "center" }}>
            Rating = [ (Mean × N) + (Global Prior × Channel Prior Strength) ] / (N + Channel Prior Strength) × 100
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Where <strong>N</strong> is the number of statements harvested, <strong>Channel Prior Strength = 4</strong>, and the final value is scaled from 0 to 100.
          </p>
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          The channel&apos;s uncertainty band (<strong>±σ</strong>) is calculated based on sample density:
        </p>
        <div style={{ fontSize: 17, fontStyle: "italic", color: "var(--fg)", textAlign: "center", margin: "16px 0" }}>
          σ = 100 / sqrt(N + Channel Prior Strength)
        </div>

        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          <strong>Leaderboard Thresholds:</strong> To prevent statistical noise, a channel is only publicly ranked on the leaderboard once it meets:
        </p>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, paddingLeft: 20 }}>
          <li>A minimum of <strong>3 statements</strong> harvested and rated.</li>
          <li>A minimum total exposure of <strong>10 views</strong> in the Arena.</li>
        </ul>
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
          To resist coordinated inauthentic behavior, vote farms, and brigading fanbases, votes are **weighted, not simply counted**. Every cast ballot has its weight computed server-side:
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
