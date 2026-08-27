// Central, env-tunable knobs.

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
  maxAiCallsPerRun: num("MAX_AI_CALLS_PER_RUN", 120),

  // ---- Slate composition ----
  // Slate creation costs no AI quota, so the pool can grow much faster than the
  // old 15-per-run trickle. A deeper pool is what lets the Arena keep serving
  // under-exposed statements instead of recycling the same handful.
  topkSlatesPerDim: num("TOPK_SLATES_PER_DIM", 8),
  pairSlatesPerDim: num("PAIR_SLATES_PER_DIM", 4),
  // Ceiling on the UNVOTED slate backlog, not on slate age — see composeSlates.
  recentSlateCeiling: num("RECENT_SLATE_CEILING", 400),
  // Slates per dimension reserved for channels that appear in no slate at all.
  // This pass runs even at the ceiling, so a newly added channel always enters
  // rotation instead of waiting for the backlog to drain.
  bootstrapSlatesPerDim: num("BOOTSTRAP_SLATES_PER_DIM", 4),
  slateRetentionDays: num("SLATE_RETENTION_DAYS", 365),

  // ---- Launch window ----
  // The full ranking bar is only meaningful once there is real vote volume.
  // Below `launchWindowVotes` the bar is deliberately lower so that ranking
  // actually happens and the leaderboard is never an empty page.
  launchWindowVotes: num("LAUNCH_WINDOW_VOTES", 10_000),
};

export interface RankingTier {
  /** Human label for the tier the platform is currently in. */
  tier: "launch" | "growth" | "mature";
  /** Distinct statements of a channel that must carry evidence. */
  minStatements: number;
  /** Total impressions those statements must have accumulated. */
  minExposure: number;
  /** True while the relaxed launch-window bars are in force. */
  launchWindow: boolean;
  /** Votes still needed before the next tier's bars kick in. */
  votesToNextTier: number | null;
}

/**
 * Ranking thresholds as a function of total votes on record.
 *
 * The bars stay LOW for the whole run-up to `launchWindowVotes` (10k by
 * default) — that is the explicit product requirement: ranking must actually
 * take place from day one. They step up in two stages rather than one cliff so
 * that channels are never yanked off the board overnight when the platform
 * crosses a round number.
 *
 *   <  2,500 votes  →  launch : 1 statement,  2 impressions
 *   <  10,000 votes →  growth : 2 statements, 4 impressions
 *   >= 10,000 votes →  mature : 3 statements, 10 impressions
 *
 * Any of these can be pinned via env (RANK_MIN_STATEMENTS / RANK_MIN_EXPOSURE)
 * for a manual override.
 */
export function rankingTier(totalVotes: number): RankingTier {
  const launchWindow = totalVotes < config.launchWindowVotes;
  const growthFloor = Math.round(config.launchWindowVotes * 0.25);

  let tier: RankingTier["tier"];
  let minStatements: number;
  let minExposure: number;
  let votesToNextTier: number | null;

  if (totalVotes < growthFloor) {
    tier = "launch";
    minStatements = 1;
    minExposure = 2;
    votesToNextTier = growthFloor - totalVotes;
  } else if (launchWindow) {
    tier = "growth";
    minStatements = 2;
    minExposure = 4;
    votesToNextTier = config.launchWindowVotes - totalVotes;
  } else {
    tier = "mature";
    minStatements = 3;
    minExposure = 10;
    votesToNextTier = null;
  }

  return {
    tier,
    minStatements: num("RANK_MIN_STATEMENTS", minStatements),
    minExposure: num("RANK_MIN_EXPOSURE", minExposure),
    launchWindow,
    votesToNextTier,
  };
}

/**
 * A channel below the ranking bar but with at least this much evidence is
 * published as PROVISIONAL — visible, sortable, but clearly marked as not yet
 * qualified. Showing these beats showing an empty leaderboard, and it makes the
 * ranking gradient visible to voters from the first day.
 */
export const PROVISIONAL_MIN_EXPOSURE = num("PROVISIONAL_MIN_EXPOSURE", 1);
