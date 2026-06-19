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
      <span style={{ marginLeft: "auto", textDecoration: "underline", cursor: "pointer" }}>
        Methodology
      </span>
      <span style={{ textDecoration: "underline", cursor: "pointer" }}>
        How we anonymize
      </span>
      <span style={{ textDecoration: "underline", cursor: "pointer" }}>API</span>
    </footer>
  );
}
