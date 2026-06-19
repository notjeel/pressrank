// The five rating dimensions, in display order (matches the DB seed + design).
export const DIMS: { key: string; label: string; short: string }[] = [
  { key: "neutrality", label: "Neutrality", short: "Neutrality" },
  { key: "factual", label: "Factual accuracy", short: "Factual" },
  { key: "sourcing", label: "Sourcing", short: "Sourcing" },
  { key: "fact_vs_opinion", label: "Fact vs opinion", short: "Fact vs opinion" },
  { key: "non_sensational", label: "Non-sensational", short: "Non-sensational" },
];

export const SERIES_COLORS = ["var(--accent)", "var(--accent2)", "#b4882f"];
export const SERIES_HEX = (accent: string, accent2: string) => [
  accent,
  accent2,
  "#b4882f",
];
