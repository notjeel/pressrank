import { createHash } from "crypto";

// Normalize then sha256 — the provenance pin. Stored on every statement so
// any later alteration of the text is provably detectable.
export function contentHash(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
