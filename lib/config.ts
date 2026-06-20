// Central, env-tunable knobs. Defaults are sized for a small launch.

function num(name: string, fallback: number): number {
  const v = process.env[name];
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

// --- Launch-window thresholds ---
// For the first 15 days after launch, use relaxed thresholds so that channels
// qualify for the leaderboard faster with fewer votes. After the window closes,
// the normal (stricter) thresholds apply automatically — no manual reset needed.
const LAUNCH_DATE = new Date("2026-06-20T00:00:00Z");
const LAUNCH_WINDOW_DAYS = 15;
const inLaunchWindow =
  (Date.now() - LAUNCH_DATE.getTime()) < LAUNCH_WINDOW_DAYS * 86_400_000;

export const config = {
  // ---- Per-user voting limits (anti-abuse + fairness) ----
  voteLimitPerWeek: num("VOTE_LIMIT_PER_WEEK", 50),
  voteLimitPerMonth: num("VOTE_LIMIT_PER_MONTH", 150),

  // ---- Daily collection budget (stay under free AI quota) ----
  // gemini-3.1-flash-lite free tier is ~500 requests/day; keep margin.
  maxAiCallsPerRun: num("MAX_AI_CALLS_PER_RUN", 120),

  // ---- Ranking thresholds (when a channel becomes publicly ranked) ----
  // Launch window (first 15 days): 1 statement, 2 exposure
  // Normal:                        3 statements, 10 exposure
  rankMinStatements: inLaunchWindow
    ? num("RANK_MIN_STATEMENTS", 1)
    : num("RANK_MIN_STATEMENTS", 3),
  rankMinExposure: inLaunchWindow
    ? num("RANK_MIN_EXPOSURE", 2)
    : num("RANK_MIN_EXPOSURE", 10),

  // Expose for logging/debugging
  inLaunchWindow,
};
