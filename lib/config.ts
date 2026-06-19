// Central, env-tunable knobs. Defaults are sized for a small launch.

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  // ---- Per-user voting limits (anti-abuse + fairness) ----
  voteLimitPerWeek: num("VOTE_LIMIT_PER_WEEK", 50),
  voteLimitPerMonth: num("VOTE_LIMIT_PER_MONTH", 150),

  // ---- Daily collection budget (stay under free AI quota) ----
  // gemini-3.1-flash-lite free tier is ~500 requests/day; keep margin.
  maxAiCallsPerRun: num("MAX_AI_CALLS_PER_RUN", 120),

  // ---- Ranking thresholds (when a channel becomes publicly ranked) ----
  rankMinStatements: num("RANK_MIN_STATEMENTS", 3),
  rankMinExposure: num("RANK_MIN_EXPOSURE", 10),
};
