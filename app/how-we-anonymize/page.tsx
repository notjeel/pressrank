"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HowWeAnonymizePage() {
  const router = useRouter();

  const stepCardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1.5px solid var(--line)",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    position: "relative",
  };

  const stepNumberStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "var(--accent)",
    marginBottom: 6,
    display: "block",
  };

  const stepTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: "var(--fg)",
    margin: "0 0 8px",
    letterSpacing: "-.01em",
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
          Integrity & Anonymization
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
        How We Keep Ratings Blind
      </h1>

      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: "var(--muted)",
          margin: "0 0 32px",
        }}
      >
        The core mechanism of PressRank is the **blind taste test for news**. If voters know which channel said what, they vote based on their existing political leans and brand loyalties. By hiding the source until the ballot is cast, we measure content quality rather than brand marketing.
      </p>

      <section style={{ marginBottom: 40 }}>
        <h2
          style={{
            fontFamily: "Newsreader, 'Hind', Georgia, serif",
            fontWeight: 500,
            fontSize: 24,
            marginBottom: 20,
          }}
        >
          The Lifecycle of a Statement
        </h2>

        <div style={stepCardStyle}>
          <span style={stepNumberStyle}>Step 1</span>
          <h3 style={stepTitleStyle}>Algorithmic Ingest</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Statements are harvested programmatically from verified channels via public platform APIs (like the YouTube Data API). We do not accept free-floating, user-submitted quotes, which closes the main vector for targeted, malicious submissions.
          </p>
        </div>

        <div style={stepCardStyle}>
          <span style={stepNumberStyle}>Step 2</span>
          <h3 style={stepTitleStyle}>Cryptographic Provenance Pinning</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Every extracted excerpt is immediately hashed using SHA-256 upon entry. The content is pinned to its original source URL and transcript. This ensures no doctored quotes, deepfakes, or alterations can be injected into the voting pool.
          </p>
        </div>

        <div style={stepCardStyle}>
          <span style={stepNumberStyle}>Step 3</span>
          <h3 style={stepTitleStyle}>Style Leakage Normalization</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Outlets often have unique catchphrases, anchor signatures, or branded jargon that could de-anonymize a card. Our AI pipeline filters out these stylistic tells while retaining the surrounding context sentences so the excerpt remains fair and readable.
          </p>
        </div>

        <div style={stepCardStyle}>
          <span style={stepNumberStyle}>Step 4</span>
          <h3 style={stepTitleStyle}>Balanced Slate Composition</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Statements are randomized into slates of 6–8 (for top-k ranking) or 2 (for pairwise matchups). We enforce a constraint of **at most one statement per channel per slate**. This forces voters to make relative decisions between different outlets.
          </p>
        </div>

        <div style={stepCardStyle}>
          <span style={stepNumberStyle}>Step 5</span>
          <h3 style={stepTitleStyle}>Permanent Anonymity</h3>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--muted)", margin: 0 }}>
            Unlike other platforms, we never reveal the sources of statements, even after you vote. This ensures voters cannot game the system by learning style patterns to vote for or against specific channels. The ratings remain completely blind from start to finish.
          </p>
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
          Collusion & Triangulation
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: "var(--muted)", marginBottom: 16 }}>
          We double-check open crowd selections against an independent **AI referee analysis** and **public fact-checkers**. If the crowd&apos;s ratings on factual accuracy diverge sharply from verified databases, the system flags the coordinates as anomalous temporal surges, protecting the leaderboard from captured-audience takeovers.
        </p>
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
          Want to explore the mathematical scoring models?
        </span>
        <button
          onClick={() => router.push("/methodology")}
          style={{
            padding: "10px 16px",
            borderRadius: 9,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          View methodology
        </button>
      </div>
    </main>
  );
}
