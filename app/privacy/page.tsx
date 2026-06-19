"use client";

export default function PrivacyPage() {
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
          Legal Policy
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
        Privacy Policy
      </h1>

      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 32px" }}>
        Last updated: June 19, 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          1. Principles of Anonymity and Privacy
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          PressRank is built around blind, community-driven credibility ratings. To ensure the integrity of this benchmark, we prioritize minimizing personal data collection while maximizing Sybil resistance. We judge content, not people, and we protect your identity with the same standard.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          2. Data We Collect and How We Protect It
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          We collect and process the following limited data points:
        </p>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 20, marginBottom: 14 }}>
          <li>
            <strong>Phone Numbers / Authentication Details:</strong> In alignment with security practices, we request phone authentication (OTP) to prevent automated click farms. Upon successful registration, phone numbers are immediately hashed. We never store raw, plain-text phone numbers in our active databases.
          </li>
          <li>
            <strong>IP Addresses:</strong> We temporarily process IP addresses at vote time solely to execute Cloudflare Turnstile anti-bot checks and prevent rate-limit flooding. IP logs are discarded automatically and are not linked to voter histories.
          </li>
          <li>
            <strong>Vote Histories:</strong> To calculate ELO ratings, we store voter choices (represented as connection vectors: user ID, slate ID, and selected statement IDs). These records are kept private and are aggregated server-side during the ratings recomputation pipeline.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          3. Security Safeguards
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          All votes are written to an append-only, tamper-evident log designed to detect retro-active editing. Administrative changes and moderation flags are strictly logged. We utilize SSL/TLS transport encryption and enforce Row Level Security (RLS) on Supabase databases to ensure that users can only access their own ballots.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          4. Contact Information
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
          If you have any inquiries regarding voter privacy, hashed authentication verification, or cookie controls, please visit our help forums or reach out to the project maintainers.
        </p>
      </section>
    </main>
  );
}
