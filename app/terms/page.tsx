"use client";

export default function TermsPage() {
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
          Legal Terms
        </span>
      </div>

      <h1
        style={{
          fontFamily: "Newsreader, 'Hind', Georgia, serif",
          fontWeight: 500,
          fontSize: "clamp(28px,5vw,40px)",
          lineHeight: 1.15,
          letterSpacing: "-.015em",
          margin: "0 0 8px",
          color: "var(--fg)",
        }}
      >
        Terms of Service
      </h1>

      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 32px" }}>
        Last updated: June 19, 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          1. Terms of Use & Participation
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          By accessing and voting in the PressRank Arena, you agree to comply with these terms. The platform is designed to compile crowd-sourced ratings on statement-level quality dimensions.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          2. Voting Integrity & Zero-Tolerance Policy
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          To ensure credibility, we strictly prohibit any form of rating manipulation. The following activities will lead to the immediate down-weighting or quarantine of your votes, and potential account suspension:
        </p>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 20, marginBottom: 14 }}>
          <li>Coordinated inauthentic behavior (CIB) including lockstep click-voting groups or bot network setups.</li>
          <li>Farming or selling verified accounts to rated entities or political entities.</li>
          <li>Utilizing automated scripts, screen macros, or emulator proxies to inflate ratings.</li>
        </ul>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          All coordinates are subject to statistical anomaly filters and AI referee validation.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          3. Fair Use & Copyright
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          PressRank programmatically harvests and displays verbatim, short text excerpts from public news media feeds (transcripts and captions) for the sole purpose of community critique, indexing, and review. This usage falls under fair dealing / fair use exceptions. We do not claim ownership of the underlying statement texts.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          4. Disclaimer of Warranties
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
          The ratings, scores, and positions displayed on the PressRank leaderboard represent compiled, subjective community opinions of anonymized statement samples. They do not constitute official legal verdicts, facts, or endorsements of any outlet. The platform is provided as-is without warranties of any kind.
        </p>
      </section>
    </main>
  );
}
