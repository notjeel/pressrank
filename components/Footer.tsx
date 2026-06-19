import Link from "next/link";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--line)",
        padding: "26px clamp(15px,4vw,40px)",
        display: "flex",
        gap: 14,
        flexWrap: "wrap",
        alignItems: "center",
        color: "var(--faint)",
        fontSize: 12,
      }}
    >
      <span style={{ fontWeight: 600, color: "var(--muted)" }}>PressRank</span>
      <span>Same yardstick for every channel.</span>
      <Link
        href="/methodology"
        style={{
          marginLeft: "auto",
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        Methodology
      </Link>
      <Link
        href="/how-we-anonymize"
        style={{
          textDecoration: "underline",
          cursor: "pointer",
        }}
      >
        How we anonymize
      </Link>
    </footer>
  );
}

