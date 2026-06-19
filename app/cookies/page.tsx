"use client";

export default function CookiesPage() {
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
          Cookie Policy
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
        Cookie Settings & Policy
      </h1>

      <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 32px" }}>
        Last updated: June 19, 2026
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          1. Why We Use Cookies
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          PressRank uses cookies and local storage parameters strictly to enable essential site features. We do not place advertising track beacons, demographic trackers, or marketing cookies.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          2. Essential Cookies in Operation
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          The following essential cookies are automatically set for proper system functioning:
        </p>
        <ul style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, paddingLeft: 20, marginBottom: 14 }}>
          <li>
            <strong>Supabase Auth Tokens:</strong> These cookies store your secure authentication token when you register or sign in. They authenticate you to post votes in the database.
          </li>
          <li>
            <strong>Theme Selector (`pr-theme`):</strong> Stores your light or dark mode selection to prevent visual flashing during page reloads.
          </li>
          <li>
            <strong>Cookie Consent Tracker (`pr-cookie-consent`):</strong> Remembers if you have acknowledged our essential cookie banner so that it does not show repeatedly.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontWeight: 500, fontSize: 22, color: "var(--fg)", marginBottom: 12 }}>
          3. How to Manage Consent
        </h2>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)", marginBottom: 14 }}>
          Essential cookies are necessary for logging in and keeping settings. If you disable cookies in your browser configurations, the sign-in features and theme options may not function correctly.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--muted)" }}>
          You can clear your local settings at any time by clicking clear browser history, which reset cookie tokens and requires re-accepting the popup banner on your next visit.
        </p>
      </section>
    </main>
  );
}
