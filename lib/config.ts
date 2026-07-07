// Central, env-tunable knobs. Defaults are sized for a small launch.

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// --- Launch-window thresholds ---
// Enforces relaxed launch thresholds (1 statement, 2 exposures) dynamically
// in the rating engine until the database accumulates at least 2,500 total votes.
// Stricter normal thresholds (3 statements, 10 exposures) apply automatically thereafter.
export const config = {
  // ---- Per-user voting limits (anti-abuse + fairness) ----
  voteLimitPerWeek: num("VOTE_LIMIT_PER_WEEK", 50),
  voteLimitPerMonth: num("VOTE_LIMIT_PER_MONTH", 150),

  // ---- Daily collection budget (stay under free AI quota) ----
  // gemini-3.1-flash-lite free tier is ~500 requests/day; keep margin.
  maxAiCallsPerRun: num("MAX_AI_CALLS_PER_RUN", 120),

  // ---- Default ranking thresholds (dynamically switched at 2.5k votes) ----
  rankMinStatements: num("RANK_MIN_STATEMENTS", 1),
  rankMinExposure: num("RANK_MIN_EXPOSURE", 2),
  inLaunchWindow: true, // Legacy compatibility flag
};
