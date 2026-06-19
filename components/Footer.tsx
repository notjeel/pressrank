import Link from "next/link";

export function Footer() {
  const colHeaderStyle: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 600,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    color: "var(--muted)",
    marginBottom: 10,
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--faint)",
    fontSize: 13,
    textDecoration: "none",
    transition: "color 0.12s",
  };

  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        background: "var(--surface)",
        color: "var(--fg)",
        width: "100%",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "44px clamp(15px,4vw,40px) 26px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 28,
            marginBottom: 38,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={colHeaderStyle}>Platform</div>
            <Link href="/arena" style={linkStyle}>Arena</Link>
            <Link href="/leaderboard" style={linkStyle}>Leaderboard</Link>
            <Link href="/compare" style={linkStyle}>Compare</Link>
            <Link href="/methodology" style={linkStyle}>Methodology</Link>
            <Link href="/how-we-anonymize" style={linkStyle}>How we anonymize</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={colHeaderStyle}>Leaderboard</div>
            <Link href="/leaderboard?dimension=factual" style={linkStyle}>Factual precision</Link>
            <Link href="/leaderboard?dimension=neutrality" style={linkStyle}>Neutrality</Link>
            <Link href="/leaderboard?dimension=sourcing" style={linkStyle}>Sourcing</Link>
            <Link href="/leaderboard?dimension=fact_vs_opinion" style={linkStyle}>Fact vs. opinion</Link>
            <Link href="/leaderboard?dimension=non_sensational" style={linkStyle}>Non-sensational</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={colHeaderStyle}>Legal</div>
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
            <Link href="/terms" style={linkStyle}>Terms of Service</Link>
            <Link href="/cookies" style={linkStyle}>Cookie Settings</Link>
          </div>


        </div>

        <div
          style={{
            borderTop: "1px solid var(--grid)",
            paddingTop: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 12.5,
            color: "var(--faint)",
            textAlign: "center",
          }}
        >
          <span>&copy; {new Date().getFullYear()} PressRank. Same yardstick for every channel.</span>
        </div>
      </div>
    </footer>
  );
}

