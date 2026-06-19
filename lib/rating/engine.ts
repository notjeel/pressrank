import type { SupabaseClient } from "@supabase/supabase-js";
import { config } from "@/lib/config";

// Shared scoring backend for BOTH mechanics.
// A vote is a slate + the subset the voter selected. This is a partial ranking
// (selected > unselected within the slate). Pairwise (n=2,k=1) is just the
// smallest case of top-k and feeds the exact same counters below.
//
// MVP scoring: per (statement, dimension) selection rate with Bayesian
// shrinkage toward the global mean, so a statement shown 5 times can't outrank
// one shown 5,000. Rolls up to per-channel ratings with sample-size shrinkage
// and a confidence band (sigma). Upgrade path: swap the per-statement estimate
// for Plackett–Luce / Glicko-2 behind this same interface.

// --- Tunables ---
const PRIOR_STRENGTH = 5; // pseudo-observations pulling toward the global mean
const GLOBAL_PRIOR = 0.4; // expected baseline selection rate (k/n ≈ 3/7)
// A channel needs this many scored statements AND this much total exposure to
// be publicly "ranked". Env-tunable (lower for a small launch).
const MIN_STATEMENTS = config.rankMinStatements;
const MIN_EXPOSURE = config.rankMinExposure;
const CHANNEL_PRIOR_STRENGTH = 4;

export interface RecomputeResult {
  votesProcessed: number;
  statementsScored: number;
  channelsRated: number;
}

export async function recomputeRatings(
  supabase: SupabaseClient
): Promise<RecomputeResult> {
  // 1. Reset counters, then replay all votes into (statement,dimension) tallies.
  const tally = new Map<
    string,
    { shown: number; selected: number; dimensionId: number; statementId: string }
  >();

  const { data: votes } = await supabase
    .from("votes")
    .select("slate_id, selected_statement_ids, weight");
  const { data: slates } = await supabase
    .from("slates")
    .select("id, dimension_id, statement_ids");
  const slateById = new Map(
    (slates ?? []).map((s) => [s.id as string, s])
  );

  let votesProcessed = 0;
  for (const v of votes ?? []) {
    const slate = slateById.get(v.slate_id as string);
    if (!slate) continue;
    votesProcessed += 1;
    const w = (v.weight as number) ?? 1;
    const selected = new Set<string>(
      (v.selected_statement_ids as string[]) ?? []
    );
    for (const sid of slate.statement_ids as string[]) {
      const key = `${sid}:${slate.dimension_id}`;
      const cur =
        tally.get(key) ??
        {
          shown: 0,
          selected: 0,
          dimensionId: slate.dimension_id as number,
          statementId: sid,
        };
      cur.shown += w;
      if (selected.has(sid)) cur.selected += w;
      tally.set(key, cur);
    }
  }

  // 2. Write per-statement scores (shrinkage-adjusted selection rate).
  const statementRows = [...tally.values()].map((t) => {
    const score = bayesShrink(t.selected, t.shown, GLOBAL_PRIOR, PRIOR_STRENGTH);
    const sigma = wilsonHalfWidth(t.selected, t.shown);
    return {
      statement_id: t.statementId,
      dimension_id: t.dimensionId,
      shown: Math.round(t.shown),
      selected: Math.round(t.selected),
      score,
      sigma,
      updated_at: new Date().toISOString(),
    };
  });

  if (statementRows.length) {
    await supabase
      .from("statement_scores")
      .upsert(statementRows, { onConflict: "statement_id,dimension_id" });
  }

  // 3. Roll statement scores up to channel ratings.
  const { data: statementMeta } = await supabase
    .from("statements")
    .select("id, channel_id");
  const channelOf = new Map(
    (statementMeta ?? []).map((s) => [s.id as string, s.channel_id as string])
  );

  // group: channel -> dimension -> list of {score, exposure}
  const byChannelDim = new Map<
    string,
    Map<number, { scores: number[]; exposure: number }>
  >();
  for (const row of statementRows) {
    const channelId = channelOf.get(row.statement_id);
    if (!channelId) continue;
    if (!byChannelDim.has(channelId)) byChannelDim.set(channelId, new Map());
    const dimMap = byChannelDim.get(channelId)!;
    const entry = dimMap.get(row.dimension_id) ?? { scores: [], exposure: 0 };
    entry.scores.push(row.score);
    entry.exposure += row.shown;
    dimMap.set(row.dimension_id, entry);
  }

  const channelRows: any[] = [];
  const rankedChannels = new Set<string>();
  for (const [channelId, dimMap] of byChannelDim) {
    for (const [dimensionId, e] of dimMap) {
      const n = e.scores.length;
      const mean = n ? e.scores.reduce((a, b) => a + b, 0) / n : GLOBAL_PRIOR;
      // sample-size shrinkage toward the global prior
      const shrunk =
        (mean * n + GLOBAL_PRIOR * CHANNEL_PRIOR_STRENGTH) /
        (n + CHANNEL_PRIOR_STRENGTH);
      const ranked = n >= MIN_STATEMENTS && e.exposure >= MIN_EXPOSURE;
      if (ranked) rankedChannels.add(channelId);
      channelRows.push({
        channel_id: channelId,
        dimension_id: dimensionId,
        rating: round1(shrunk * 100), // 0..100 display scale
        sigma: round1((1 / Math.sqrt(n + CHANNEL_PRIOR_STRENGTH)) * 100),
        n_statements: n,
        exposure: Math.round(e.exposure),
        ranked,
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (channelRows.length) {
    await supabase
      .from("channel_ratings")
      .upsert(channelRows, { onConflict: "channel_id,dimension_id" });
  }

  return {
    votesProcessed,
    statementsScored: statementRows.length,
    channelsRated: rankedChannels.size,
  };
}

// Bayesian shrinkage of a rate toward a prior.
function bayesShrink(
  hits: number,
  trials: number,
  prior: number,
  strength: number
): number {
  return (hits + prior * strength) / (trials + strength);
}

// Wilson-style half-width as a cheap uncertainty proxy (0..1).
function wilsonHalfWidth(hits: number, trials: number): number {
  if (trials <= 0) return 1;
  const p = hits / trials;
  return Math.min(1, 1.96 * Math.sqrt((p * (1 - p)) / trials) + 1 / trials);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
