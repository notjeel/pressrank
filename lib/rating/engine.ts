import type { SupabaseClient } from "@supabase/supabase-js";
import { selectAll, upsertChunked } from "@/lib/supabase/paginate";
import { hasCapability, withoutKeys } from "@/lib/supabase/capabilities";
import {
  PROVISIONAL_MIN_EXPOSURE,
  rankingTier,
  type RankingTier,
} from "@/lib/config";

// ---------------------------------------------------------------------------
// Shared scoring backend for BOTH mechanics.
//
// A vote is a slate + the subset the voter selected — a partial ranking
// (selected > unselected within that slate). Pairwise (n=2, k=1) is just the
// smallest case of top-k and feeds the exact same counters.
//
// THE CENTRAL IDEA: a selection is only informative relative to how likely it
// was by chance. Being picked out of a 2-way slate is a coin flip; being picked
// out of a 7-way slate where the voter chose 3 is a 43% shot. The old engine
// compared every statement against one hard-coded 0.4 baseline, which quietly
// penalised statements that appeared in small slates and rewarded ones that
// appeared in large ones.
//
// Instead we accumulate, per statement, the EXPECTED number of selections under
// random play (sum of picked/slate_size over its impressions), shrink the
// observed rate toward that statement's own baseline, then map the result
// through an odds ratio so that "exactly at chance" always lands on 0.50
// whatever slate shapes were involved. Every statement is on one scale.
//
// Rollup to a channel pools its statements' counts (evidence-weighted, with a
// per-statement cap so one viral excerpt cannot carry a channel), shrinks
// again, and reports a real binomial confidence band instead of a function of
// the statement count alone.
// ---------------------------------------------------------------------------

// --- Tunables ---
/** Pseudo-observations pulling a statement toward its own chance baseline. */
const STATEMENT_PRIOR_STRENGTH = 5;
/** Pseudo-observations pulling a channel toward chance. */
const CHANNEL_PRIOR_STRENGTH = 6;
/** Max impressions any single statement may contribute to its channel. */
const STATEMENT_EXPOSURE_CAP = 40;
/** z used inside the internal Wilson uncertainty proxy (1.96 is ~95%). */
const Z = 1.96;
/**
 * The published `sigma` is ONE standard error, because that is what the UI
 * labels it (`rating +/- sigma`). Consumers that want a 95% interval multiply
 * by 1.96 themselves — the leaderboard does exactly that to rank by a
 * conservative lower bound.
 */
const SIGMA_Z = 1;

export interface RecomputeResult {
  votesProcessed: number;
  votesSkipped: number;
  statementsScored: number;
  channelsRated: number;
  channelsProvisional: number;
  totalVotes: number;
  thresholds: RankingTier;
  durationMs: number;
  warnings: string[];
}

interface Tally {
  statementId: string;
  dimensionId: number;
  /** Raw impression count — what the exposure threshold is measured in. */
  rawShown: number;
  /** Weight-summed impressions — the denominator of the rate. */
  wShown: number;
  /** Weight-summed selections. */
  selected: number;
  /** Weight-summed selections expected under random play. */
  expected: number;
  /** Distinct votes that touched this statement. */
  votes: number;
}

export async function recomputeRatings(
  supabase: SupabaseClient
): Promise<RecomputeResult> {
  const startedAt = Date.now();
  const warnings: string[] = [];

  // -------------------------------------------------------------------------
  // 1. Load everything. `selectAll` pages past PostgREST's 1000-row cap — the
  //    previous version silently scored only the first 1000 slates and the
  //    first 1000 statements, which is why most channels never rolled up.
  // -------------------------------------------------------------------------
  const [votes, slates, statementMeta] = await Promise.all([
    selectAll<{
      slate_id: string;
      selected_statement_ids: string[] | null;
      weight: number | null;
    }>(
      () =>
        supabase.from("votes").select("slate_id, selected_statement_ids, weight"),
      "load votes"
    ),
    selectAll<{
      id: string;
      dimension_id: number;
      statement_ids: string[];
      max_pick: number;
    }>(
      () =>
        supabase
          .from("slates")
          .select("id, dimension_id, statement_ids, max_pick"),
      "load slates"
    ),
    selectAll<{ id: string; channel_id: string }>(
      () => supabase.from("statements").select("id, channel_id"),
      "load statements"
    ),
  ]);

  const slateById = new Map(slates.map((s) => [s.id, s]));
  const channelOf = new Map(statementMeta.map((s) => [s.id, s.channel_id]));

  const totalVotes = votes.length;
  const thresholds = rankingTier(totalVotes);

  // -------------------------------------------------------------------------
  // 2. Replay every vote into (statement, dimension) tallies.
  // -------------------------------------------------------------------------
  const tally = new Map<string, Tally>();
  let votesProcessed = 0;
  let votesSkipped = 0;

  for (const v of votes) {
    const slate = slateById.get(v.slate_id);
    if (!slate) {
      votesSkipped += 1; // orphaned vote — slate row is gone
      continue;
    }

    const ids = slate.statement_ids ?? [];
    const size = ids.length;
    if (size < 2) {
      votesSkipped += 1;
      continue;
    }

    const inSlate = new Set(ids);
    const picked = new Set(
      (v.selected_statement_ids ?? []).filter((id) => inSlate.has(id))
    );
    // An abstention carries no ranking information. Counting it as an
    // impression would drag every statement in the slate toward zero.
    if (picked.size === 0) {
      votesSkipped += 1;
      continue;
    }

    votesProcessed += 1;
    const w = clamp(Number(v.weight ?? 1) || 1, 0, 1);
    // Chance that a random voter making the SAME number of picks lands on any
    // one statement of this slate.
    const chance = picked.size / size;

    for (const sid of ids) {
      const key = sid + ":" + slate.dimension_id;
      let t = tally.get(key);
      if (!t) {
        t = {
          statementId: sid,
          dimensionId: slate.dimension_id,
          rawShown: 0,
          wShown: 0,
          selected: 0,
          expected: 0,
          votes: 0,
        };
        tally.set(key, t);
      }
      t.rawShown += 1;
      t.wShown += w;
      t.expected += w * chance;
      t.votes += 1;
      if (picked.has(sid)) t.selected += w;
    }
  }

  if (votesSkipped) {
    warnings.push(
      votesSkipped + " vote(s) skipped (orphaned slate or abstention)"
    );
  }

  // -------------------------------------------------------------------------
  // 3. Drop tallies for statements that no longer exist.
  //
  //    Slates hold a plain uuid[] with no foreign key, so a statement can be
  //    removed while slates still reference it. Writing a score for a dangling
  //    id violates statement_scores' FK and rejects the WHOLE batch — which is
  //    precisely what was happening: the old engine deleted every score, hit
  //    this error on the way back in, never checked `error`, and left the table
  //    permanently empty while reporting success.
  // -------------------------------------------------------------------------
  const live = [...tally.values()].filter((t) => channelOf.has(t.statementId));
  const orphanedStatements = tally.size - live.length;
  if (orphanedStatements) {
    warnings.push(
      orphanedStatements +
        " tally row(s) dropped — slate references a statement that no longer exists"
    );
  }

  // -------------------------------------------------------------------------
  // 4. Per-statement score: shrink toward the statement's OWN chance baseline,
  //    then normalise so chance == 0.50 on a common scale.
  // -------------------------------------------------------------------------
  const scoredAt = new Date().toISOString();
  const statementRows = live.map((t) => {
    const chance = t.wShown > 0 ? t.expected / t.wShown : 0.5;
    const p = shrink(t.selected, t.wShown, chance, STATEMENT_PRIOR_STRENGTH);
    return {
      statement_id: t.statementId,
      dimension_id: t.dimensionId,
      shown: Math.round(t.wShown),
      raw_shown: t.rawShown,
      selected: Math.round(t.selected),
      expected: round3(t.expected),
      score: round4(normaliseAgainstChance(p, chance)),
      sigma: round4(wilsonHalfWidth(t.selected, t.wShown)),
      updated_at: scoredAt,
    };
  });

  // -------------------------------------------------------------------------
  // 5. Roll statements up to channel x dimension by POOLING evidence.
  //    A plain mean over statement scores (the old behaviour) let a statement
  //    seen twice outweigh one seen forty times. Pooling the counts weights by
  //    evidence automatically; the per-statement cap stops one excerpt from
  //    becoming the channel's whole rating.
  // -------------------------------------------------------------------------
  interface ChannelAcc {
    selected: number;
    expected: number;
    wShown: number;
    rawShown: number;
    votes: number;
    skills: number[];
  }
  const byChannelDim = new Map<string, Map<number, ChannelAcc>>();

  for (const t of live) {
    const channelId = channelOf.get(t.statementId)!;
    if (!byChannelDim.has(channelId)) byChannelDim.set(channelId, new Map());
    const dimMap = byChannelDim.get(channelId)!;
    const acc =
      dimMap.get(t.dimensionId) ??
      ({
        selected: 0,
        expected: 0,
        wShown: 0,
        rawShown: 0,
        votes: 0,
        skills: [],
      } as ChannelAcc);

    // Cap this statement's influence, preserving its rate.
    const f =
      t.rawShown > STATEMENT_EXPOSURE_CAP
        ? STATEMENT_EXPOSURE_CAP / t.rawShown
        : 1;

    acc.selected += t.selected * f;
    acc.expected += t.expected * f;
    acc.wShown += t.wShown * f;
    acc.rawShown += t.rawShown;
    acc.votes += t.votes;

    const chance = t.wShown > 0 ? t.expected / t.wShown : 0.5;
    acc.skills.push(
      normaliseAgainstChance(
        shrink(t.selected, t.wShown, chance, STATEMENT_PRIOR_STRENGTH),
        chance
      )
    );

    dimMap.set(t.dimensionId, acc);
  }

  const channelRows: Record<string, unknown>[] = [];
  const rankedChannels = new Set<string>();
  const provisionalChannels = new Set<string>();

  for (const [channelId, dimMap] of byChannelDim) {
    for (const [dimensionId, acc] of dimMap) {
      const n = acc.skills.length;
      const chance = acc.wShown > 0 ? acc.expected / acc.wShown : 0.5;
      const p = shrink(acc.selected, acc.wShown, chance, CHANNEL_PRIOR_STRENGTH);
      const rating = normaliseAgainstChance(p, chance);

      // --- Honest confidence band ------------------------------------------
      // Binomial standard error on the pooled rate, pushed through the same
      // normalisation so the band lives on the display scale...
      const nEff = acc.wShown + CHANNEL_PRIOR_STRENGTH;
      const se = Math.sqrt(Math.max(p * (1 - p), 1e-9) / nEff);
      const hi = normaliseAgainstChance(
        clamp(p + SIGMA_Z * se, 1e-6, 1 - 1e-6),
        chance
      );
      const lo = normaliseAgainstChance(
        clamp(p - SIGMA_Z * se, 1e-6, 1 - 1e-6),
        chance
      );
      const binomHalf = (hi - lo) / 2;
      // ...plus how much the channel's own statements disagree with each other.
      // A channel whose excerpts score 0.2 and 0.8 genuinely is less certain
      // than one whose excerpts both score 0.5.
      const between = n >= 2 ? stdev(acc.skills) / Math.sqrt(n) : 0;
      const sigma = Math.sqrt(binomHalf * binomHalf + between * between);

      const exposure = acc.rawShown;
      const ranked =
        n >= thresholds.minStatements && exposure >= thresholds.minExposure;
      const provisional = !ranked && exposure >= PROVISIONAL_MIN_EXPOSURE;

      if (ranked) rankedChannels.add(channelId);
      else if (provisional) provisionalChannels.add(channelId);

      channelRows.push({
        channel_id: channelId,
        dimension_id: dimensionId,
        rating: round1(rating * 100),
        sigma: round1(clamp(sigma * 100, 0.3, 50)),
        n_statements: n,
        exposure,
        n_votes: acc.votes,
        chance: round4(chance),
        ranked,
        provisional,
        updated_at: scoredAt,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 6. Write. NON-DESTRUCTIVE: nothing is deleted. Every computed row is
  //    upserted, and rows that no longer have evidence behind them are RETIRED
  //    in place (zeroed + unranked) rather than dropped, so history, foreign
  //    keys and external references survive a bad run.
  //
  //    The old engine deleted every rating first and then rebuilt — so a
  //    failure halfway through (and nothing there checked for errors) left the
  //    public leaderboard empty.
  // -------------------------------------------------------------------------
  const [canExpected, canProvisional] = await Promise.all([
    hasCapability(supabase, "statementExpected"),
    hasCapability(supabase, "ratingProvisional"),
  ]);
  if (!canExpected || !canProvisional) {
    warnings.push(
      "migration 0004 not applied — writing pre-0004 columns only; " +
        "run supabase/migrations/0004_ranking_engine.sql to enable " +
        "provisional ranking and least-exposed slate serving"
    );
  }

  await upsertChunked(
    supabase,
    "statement_scores",
    canExpected
      ? statementRows
      : withoutKeys(statementRows, ["expected", "raw_shown"]),
    "statement_id,dimension_id"
  );
  await upsertChunked(
    supabase,
    "channel_ratings",
    canProvisional
      ? channelRows
      : withoutKeys(channelRows, ["provisional", "n_votes", "chance"]),
    "channel_id,dimension_id"
  );

  await retireStaleRows(
    supabase,
    statementRows,
    channelRows,
    scoredAt,
    warnings,
    { canExpected, canProvisional }
  );

  const result: RecomputeResult = {
    votesProcessed,
    votesSkipped,
    statementsScored: statementRows.length,
    channelsRated: rankedChannels.size,
    channelsProvisional: provisionalChannels.size,
    totalVotes,
    thresholds,
    durationMs: Date.now() - startedAt,
    warnings,
  };

  // Audit trail — proves the board moved because votes moved. Best-effort: a
  // missing table (migration not yet applied) must not fail the recompute.
  if (await hasCapability(supabase, "recomputeLog")) {
    await writeAuditRow(supabase, result, thresholds, warnings);
  }

  return result;
}

async function writeAuditRow(
  supabase: SupabaseClient,
  result: RecomputeResult,
  thresholds: RankingTier,
  warnings: string[]
): Promise<void> {
  const { error: logErr } = await supabase.from("recompute_runs").insert({
    votes_processed: result.votesProcessed,
    votes_skipped: result.votesSkipped,
    statements_scored: result.statementsScored,
    channels_ranked: result.channelsRated,
    channels_provisional: result.channelsProvisional,
    total_votes: result.totalVotes,
    tier: thresholds.tier,
    min_statements: thresholds.minStatements,
    min_exposure: thresholds.minExposure,
    duration_ms: result.durationMs,
  });
  if (logErr) warnings.push("audit log: " + logErr.message);
}

/**
 * Rows that exist in the DB but carry no evidence in this run (their slate or
 * statement was retired) are zeroed and unranked — never deleted.
 */
async function retireStaleRows(
  supabase: SupabaseClient,
  statementRows: { statement_id: string; dimension_id: number }[],
  channelRows: Record<string, unknown>[],
  now: string,
  warnings: string[],
  caps: { canExpected: boolean; canProvisional: boolean }
): Promise<void> {
  try {
    const liveChannelKeys = new Set(
      channelRows.map((r) => r.channel_id + ":" + r.dimension_id)
    );
    const existing = await selectAll<{
      channel_id: string;
      dimension_id: number;
    }>(
      () => {
        const q = supabase
          .from("channel_ratings")
          .select("channel_id, dimension_id");
        return caps.canProvisional
          ? q.or("ranked.eq.true,provisional.eq.true")
          : q.eq("ranked", true);
      },
      "load existing ratings"
    );
    const stale = existing.filter(
      (r) => !liveChannelKeys.has(r.channel_id + ":" + r.dimension_id)
    );
    if (stale.length) {
      const rows = stale.map((r) => ({
        channel_id: r.channel_id,
        dimension_id: r.dimension_id,
        rating: 50,
        sigma: 50,
        n_statements: 0,
        exposure: 0,
        n_votes: 0,
        ranked: false,
        provisional: false,
        updated_at: now,
      }));
      await upsertChunked(
        supabase,
        "channel_ratings",
        caps.canProvisional
          ? rows
          : withoutKeys(rows, ["provisional", "n_votes", "chance"]),
        "channel_id,dimension_id"
      );
      warnings.push(stale.length + " rating row(s) retired (no evidence left)");
    }

    const liveStatementKeys = new Set(
      statementRows.map((r) => r.statement_id + ":" + r.dimension_id)
    );
    const existingScores = await selectAll<{
      statement_id: string;
      dimension_id: number;
    }>(
      () =>
        supabase
          .from("statement_scores")
          .select("statement_id, dimension_id")
          .gt("shown", 0),
      "load existing statement scores"
    );
    const staleScores = existingScores.filter(
      (r) => !liveStatementKeys.has(r.statement_id + ":" + r.dimension_id)
    );
    if (staleScores.length) {
      const rows = staleScores.map((r) => ({
        statement_id: r.statement_id,
        dimension_id: r.dimension_id,
        shown: 0,
        raw_shown: 0,
        selected: 0,
        expected: 0,
        score: 0.5,
        sigma: 1,
        updated_at: now,
      }));
      await upsertChunked(
        supabase,
        "statement_scores",
        caps.canExpected ? rows : withoutKeys(rows, ["expected", "raw_shown"]),
        "statement_id,dimension_id"
      );
    }
  } catch (e) {
    // Retirement is housekeeping — never let it invalidate a good recompute.
    warnings.push("retire stale rows: " + (e as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Maths helpers
// ---------------------------------------------------------------------------

/** Bayesian shrinkage of an observed rate toward a prior. Exported for tests. */
export function shrink(
  hits: number,
  trials: number,
  prior: number,
  strength: number
): number {
  const p = (hits + prior * strength) / (trials + strength);
  return clamp(p, 1e-6, 1 - 1e-6);
}

/**
 * Map a selection rate onto a chance-free 0..1 scale via the odds ratio against
 * its own baseline. Performing exactly at chance returns 0.50 for ANY baseline,
 * so a statement judged only in 2-way slates (chance 0.50) and one judged only
 * in 7-way slates (chance 0.43) are finally directly comparable.
 *
 * Exported for tests.
 */
export function normaliseAgainstChance(p: number, chance: number): number {
  const c = clamp(chance, 0.02, 0.98);
  const pp = clamp(p, 1e-6, 1 - 1e-6);
  const oddsRatio = (pp / (1 - pp)) * ((1 - c) / c);
  return oddsRatio / (1 + oddsRatio);
}

/** Wilson-style half-width as a cheap uncertainty proxy (0..1). */
function wilsonHalfWidth(hits: number, trials: number): number {
  if (trials <= 0) return 1;
  const p = clamp(hits / trials, 0, 1);
  return Math.min(1, Z * Math.sqrt((p * (1 - p)) / trials) + 1 / trials);
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(Math.max(v, 0));
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}
function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
