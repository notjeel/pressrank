import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/paginate";
import { hasCapability } from "@/lib/supabase/capabilities";
import { rankingTier } from "@/lib/config";

export const dynamic = "force-dynamic";

// GET /api/leaderboard?dimension=neutrality&medium=youtube&content_type=&lang=
//   &include=ranked|all   (default: all)
//
// Returns ranked channels for one dimension, with rating + confidence band.
//
// Two things changed here, both aimed at the board never being an empty page:
//
//  1. PROVISIONAL ROWS ARE RETURNED. A channel with real votes behind it that
//     has not yet cleared the exposure bar used to be invisible — with a young
//     database that meant an all-but-blank leaderboard. Those rows now come
//     back flagged `provisional: true`, sorted below the qualified ones, so the
//     ranking is visible and honest at the same time.
//  2. `meta` carries the live thresholds and vote count, so the UI can explain
//     WHY a row is provisional and how far off the next tier is.
//  3. RANK ORDER IS THE CONFIDENCE LOWER BOUND, not the raw rating. Sorting on
//     the raw number lets a channel that got lucky on two impressions sit above
//     one measured over thirty. Ranking on `rating - 1.96 * sigma` — the
//     standard conservative estimate — means a channel climbs by being good AND
//     by being measured, which is also exactly the incentive we want the Arena
//     to create. The displayed figure is still the rating itself.

/** z for the 95% lower bound the board ranks on. */
const RANK_Z = 1.96;

/** Conservative estimate: what the rating is at least, given the evidence. */
function lowerBound(rating: number, sigma: number): number {
  return Math.max(0, rating - RANK_Z * sigma);
}

const CHANNEL_COLUMNS =
  "id, name, handle, medium, entity_type, content_type, language, country, logo_url, verified";

interface RatingRow {
  channel_id: string;
  dimension_id: number;
  rating: number;
  sigma: number;
  n_statements: number;
  exposure: number;
  ranked: boolean;
  provisional?: boolean;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const dimensionKey = sp.get("dimension") || "neutrality";
  const medium = sp.get("medium");
  const contentType = sp.get("content_type");
  const lang = sp.get("lang");
  const rankedOnly = sp.get("include") === "ranked";

  const supabase = createSupabaseAdminClient();
  const canProvisional = await hasCapability(supabase, "ratingProvisional");

  const [{ count: totalVotes }, { data: dims }] = await Promise.all([
    supabase.from("votes").select("id", { count: "exact", head: true }),
    supabase.from("dimensions").select("id, key, label").order("sort"),
  ]);
  const thresholds = rankingTier(totalVotes ?? 0);

  // --- Channels (one fetch, filtered) --------------------------------------
  let chQuery = () => {
    let q = supabase.from("channels").select(CHANNEL_COLUMNS);
    if (medium) q = q.eq("medium", medium);
    if (contentType) q = q.eq("content_type", contentType);
    if (lang) q = q.eq("language", lang);
    return q;
  };
  const channels = await selectAll<any>(chQuery, "load channels");
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const baseMeta = {
    totalVotes: totalVotes ?? 0,
    tier: thresholds.tier,
    minStatements: thresholds.minStatements,
    minExposure: thresholds.minExposure,
    launchWindow: thresholds.launchWindow,
    votesToNextTier: thresholds.votesToNextTier,
  };

  // --- Which rating rows are eligible to be shown --------------------------
  const eligible = (r: RatingRow) =>
    r.ranked || (!rankedOnly && canProvisional && r.provisional === true);

  // -------------------------------------------------------------------------
  // Overall: aggregate a channel across every dimension it has evidence in.
  // -------------------------------------------------------------------------
  if (dimensionKey === "overall") {
    const all = await selectAll<RatingRow>(
      () =>
        supabase
          .from("channel_ratings")
          .select(
            canProvisional
              ? "channel_id, dimension_id, rating, sigma, n_statements, exposure, ranked, provisional"
              : "channel_id, dimension_id, rating, sigma, n_statements, exposure, ranked"
          ),
      "load ratings"
    );

    const agg = new Map<
      string,
      {
        ratings: number[];
        sigmas: number[];
        nStatements: number;
        exposure: number;
        rankedDims: number;
      }
    >();

    for (const r of all) {
      if (!eligible(r)) continue;
      if (!channelById.has(r.channel_id)) continue; // filtered out
      const e =
        agg.get(r.channel_id) ??
        { ratings: [], sigmas: [], nStatements: 0, exposure: 0, rankedDims: 0 };
      e.ratings.push(r.rating);
      e.sigmas.push(r.sigma);
      // Sample size is per-dimension; the headline figure is the best-evidenced
      // dimension, while exposure genuinely accumulates across all of them.
      e.nStatements = Math.max(e.nStatements, r.n_statements);
      e.exposure += r.exposure;
      if (r.ranked) e.rankedDims += 1;
      agg.set(r.channel_id, e);
    }

    // Qualifying overall means the channel cleared the bar on more than one
    // question — a single lucky dimension is not an overall verdict.
    const dimsNeeded = Math.min(2, dims?.length ?? 2);

    const rows = [...agg.entries()].map(([channelId, e]) => {
      const k = e.ratings.length;
      const rating = e.ratings.reduce((a, b) => a + b, 0) / k;
      // Independent per-dimension errors: the mean's error shrinks as sqrt(k).
      const sigma =
        Math.sqrt(e.sigmas.reduce((a, s) => a + s * s, 0)) / Math.max(k, 1);
      const ranked = e.rankedDims >= dimsNeeded;
      return {
        channel: channelById.get(channelId),
        rating: round1(rating),
        sigma: round1(sigma),
        lower_bound: round1(lowerBound(rating, sigma)),
        n_statements: e.nStatements,
        exposure: e.exposure,
        dimensions_rated: k,
        dimensions_ranked: e.rankedDims,
        ranked,
        provisional: !ranked,
      };
    });

    return NextResponse.json({
      dimension: { id: 0, key: "overall", label: "Overall Rating" },
      rows: sortBoard(rows),
      meta: { ...baseMeta, ...counts(rows) },
    });
  }

  // -------------------------------------------------------------------------
  // A single dimension.
  // -------------------------------------------------------------------------
  const dim = (dims ?? []).find((d) => d.key === dimensionKey);
  if (!dim) {
    return NextResponse.json({ error: "unknown dimension" }, { status: 400 });
  }

  const ratings = await selectAll<RatingRow>(
    () =>
      supabase
        .from("channel_ratings")
        .select(
          canProvisional
            ? "channel_id, dimension_id, rating, sigma, n_statements, exposure, ranked, provisional"
            : "channel_id, dimension_id, rating, sigma, n_statements, exposure, ranked"
        )
        .eq("dimension_id", dim.id),
    "load ratings"
  );

  const rows = ratings
    .filter((r) => eligible(r) && channelById.has(r.channel_id))
    .map((r) => ({
      channel: channelById.get(r.channel_id),
      rating: r.rating,
      sigma: r.sigma,
      lower_bound: round1(lowerBound(r.rating, r.sigma)),
      n_statements: r.n_statements,
      exposure: r.exposure,
      ranked: r.ranked,
      provisional: !r.ranked,
    }));

  return NextResponse.json({
    dimension: dim,
    rows: sortBoard(rows),
    meta: { ...baseMeta, ...counts(rows) },
  });
}

/**
 * Qualified channels first, then provisional ones; within each block, by the
 * confidence lower bound so better-evidenced channels outrank lucky ones.
 */
function sortBoard<
  T extends {
    ranked: boolean;
    rating: number;
    sigma: number;
    lower_bound: number;
    exposure: number;
  }
>(rows: T[]): T[] {
  return rows.sort((a, b) => {
    if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
    if (b.lower_bound !== a.lower_bound) return b.lower_bound - a.lower_bound;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return b.exposure - a.exposure; // tie-break on evidence, not arbitrarily
  });
}

function counts(rows: { ranked: boolean }[]) {
  const rankedCount = rows.filter((r) => r.ranked).length;
  return {
    rankedCount,
    provisionalCount: rows.length - rankedCount,
  };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
