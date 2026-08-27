import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import { selectAll } from "@/lib/supabase/paginate";
import { hasCapability } from "@/lib/supabase/capabilities";
import type { Channel } from "@/lib/supabase/types";
import { contentHash } from "./hash";
import {
  fetchRecentVideos,
  fetchVideoTranscript,
  fetchYouTubeChannel,
} from "./youtube";

export interface CollectResult {
  enriched: number;
  statsUpdated: number;
  statementsAdded: number;
  slatesCreated: number;
  aiCalls: number;
  budgetReached: boolean;
  errors: string[];
}

// Refresh windows — skip work that was done recently to respect API quotas.
const ENRICH_TTL_H = 24 * 7;
const STATS_TTL_H = 24;
const STATEMENTS_TTL_H = 24; // re-harvest daily so the corpus keeps growing
const STATEMENTS_PER_CHANNEL = 6;

/**
 * The fully-automated collection job. Discovers/enriches metadata, fetches
 * reach stats, harvests provenance-pinned statements, tags them, and composes
 * fresh voting slates. The ONLY thing it does not do is rate channels — that
 * stays community-driven.
 */
export async function runCollection(
  supabase: SupabaseClient,
  opts: { limit?: number } = {}
): Promise<CollectResult> {
  const ai = getAIProvider();
  const result: CollectResult = {
    enriched: 0,
    statsUpdated: 0,
    statementsAdded: 0,
    slatesCreated: 0,
    aiCalls: 0,
    budgetReached: false,
    errors: [],
  };

  // Stale-first: process the channels we've touched least recently, so a daily
  // run rotates through the whole set over time and keeps the corpus fresh.
  const { data: channels, error } = await supabase
    .from("channels")
    .select("*")
    .order("statements_fetched_at", { ascending: true, nullsFirst: true })
    .limit(opts.limit ?? 50);
  if (error) {
    result.errors.push(`load channels: ${error.message}`);
    return result;
  }

  const startTime = Date.now();
  const aiBudget = config.maxAiCallsPerRun;
  for (const ch of (channels ?? []) as Channel[]) {
    // Stop spending AI calls once the daily budget is gone; non-AI work and
    // slate composition still run. Remaining channels are picked up tomorrow.
    if (result.aiCalls >= aiBudget) {
      result.budgetReached = true;
      break;
    }
    // Gracefully break out of the loop before hitting Vercel's serverless timeout (300s limit).
    // This leaves a 40-second buffer for slate composition and final writes to complete.
    if (Date.now() - startTime > 260000) {
      break;
    }
    try {
      await enrichChannel(supabase, ai, ch, result, aiBudget);
      await fetchStats(supabase, ch, result);
      await harvestStatements(supabase, ai, ch, result, aiBudget);
    } catch (e) {
      result.errors.push(`${ch.name}: ${(e as Error).message}`);
    }
  }

  result.slatesCreated = await composeSlates(supabase, result);

  try {
    await autoArchiveYearlyRatings(supabase);
  } catch (e) {
    result.errors.push(`auto-archive: ${(e as Error).message}`);
  }

  return result;
}

// ---------- Step 1: discover / enrich metadata via AI ----------
async function enrichChannel(
  supabase: SupabaseClient,
  ai: ReturnType<typeof getAIProvider>,
  ch: Channel,
  result: CollectResult,
  aiBudget: number
) {
  if (!isStale(ch.enriched_at, ENRICH_TTL_H)) return;
  if (result.aiCalls >= aiBudget) return;
  result.aiCalls += 1;
  const e = await ai.enrichChannel({
    name: ch.name,
    handle: ch.handle,
    medium: ch.medium,
    official_url: ch.official_url,
  });
  const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
  if (e.medium) patch.medium = e.medium;
  if (e.entity_type) patch.entity_type = e.entity_type;
  if (e.content_type) patch.content_type = e.content_type;
  if (e.language && !ch.language) patch.language = e.language;
  if (e.country && !ch.country) patch.country = e.country;
  if (e.official_url && !ch.official_url) patch.official_url = e.official_url;
  if (e.logo_url && !ch.logo_url) patch.logo_url = e.logo_url;

  const { error } = await supabase.from("channels").update(patch).eq("id", ch.id);
  if (error) result.errors.push(`enrich ${ch.name}: ${error.message}`);
  else {
    // Mutate local copy so later steps see fresh values.
    Object.assign(ch, patch);
    result.enriched += 1;
  }
}

// ---------- Step 2: fetch reach stats ----------
async function fetchStats(
  supabase: SupabaseClient,
  ch: Channel,
  result: CollectResult
) {
  if (!isStale(ch.stats_fetched_at, STATS_TTL_H)) return;
  if (ch.medium !== "youtube" && !ch.youtube_channel_id && !ch.handle) return;

  const yt = await fetchYouTubeChannel({
    channelId: ch.youtube_channel_id,
    handle: ch.handle,
  });
  if (!yt) return;

  const patch: Record<string, unknown> = {
    stats_fetched_at: new Date().toISOString(),
  };
  if (!ch.youtube_channel_id) patch.youtube_channel_id = yt.channelId;
  if (yt.thumbnail && !ch.logo_url) patch.logo_url = yt.thumbnail;
  await supabase.from("channels").update(patch).eq("id", ch.id);
  Object.assign(ch, patch);

  const { error } = await supabase.from("channel_stats").insert({
    channel_id: ch.id,
    subs: yt.subs,
    views: yt.views,
  });
  if (error) result.errors.push(`stats ${ch.name}: ${error.message}`);
  else result.statsUpdated += 1;
}

// ---------- Step 3: harvest provenance-pinned statements ----------
async function harvestStatements(
  supabase: SupabaseClient,
  ai: ReturnType<typeof getAIProvider>,
  ch: Channel,
  result: CollectResult,
  aiBudget: number
) {
  if (!isStale(ch.statements_fetched_at, STATEMENTS_TTL_H)) return;
  if (!ch.youtube_channel_id) return;
  if (result.aiCalls >= aiBudget) return;

  const yt = await fetchYouTubeChannel({ channelId: ch.youtube_channel_id });
  if (!yt?.uploadsPlaylistId) return;
  const videos = await fetchRecentVideos(yt.uploadsPlaylistId, 6);

  let added = 0;
  for (const v of videos) {
    if (result.aiCalls >= aiBudget) break;
    // Corpus = title + description (always available via Data API), plus the
    // caption transcript when obtainable (best-effort). All provenance-pinned.
    const transcript = await fetchVideoTranscript(v.videoId);
    const sourceText = [v.title, v.description, transcript]
      .filter(Boolean)
      .join("\n")
      .trim();
    if (sourceText.length < 80) continue;

    result.aiCalls += 1;
    const excerpts = await ai.extractStatements({
      sourceText,
      channelName: ch.name,
      maxStatements: 2,
    });

    for (const ex of excerpts) {
      const text = ex.text?.trim();
      if (!text || text.length < 20) continue;
      
      // L2 Guard: Reject transactional metadata, links, and payment details
      if (isJunkStatement(text)) continue;

      // L2 Brand Leak Guard: Reject statements containing the channel's own name or key name parts
      const lowerText = text.toLowerCase();
      const lowerChanName = ch.name.toLowerCase();
      if (lowerText.includes(lowerChanName)) continue;
      
      const nameParts = lowerChanName.split(/\s+/).filter(part => part.length > 3 && part !== "news" && part !== "india" && part !== "official");
      if (nameParts.some(part => lowerText.includes(part))) continue;

      // Provenance check: the excerpt must actually appear in the source.
      const inSource = sourceText
        .toLowerCase()
        .includes(text.slice(0, 40).toLowerCase());
      if (!inSource) continue;

      const { error } = await supabase.from("statements").insert({
        channel_id: ch.id,
        text,
        context: ex.context ?? null,
        source_url: `https://www.youtube.com/watch?v=${v.videoId}`,
        source_ref: v.videoId,
        content_hash: contentHash(text),
      });
      // Unique (channel_id, content_hash) — ignore dupes.
      if (!error) added += 1;
    }
    if (added >= STATEMENTS_PER_CHANNEL) break;
  }

  await supabase
    .from("channels")
    .update({ statements_fetched_at: new Date().toISOString() })
    .eq("id", ch.id);
  result.statementsAdded += added;
}

// ---------- Step 5: compose balanced, coverage-aware slates ----------
//
// The old composer drew statements uniformly at random from whatever the first
// 1000 rows happened to be. With 4,000+ statements that meant three quarters of
// the corpus could never be slated at all, and the statements that WERE slated
// accumulated exposure unevenly — so channels crawled toward the ranking
// threshold at wildly different rates.
//
// This version pages the whole corpus, then builds each slate from the
// LEAST-COVERED channels and their LEAST-COVERED statements, where "coverage"
// counts both votes already received and slates already queued. Coverage
// spreads evenly, every channel reaches the ranking bar at about the same time,
// and the draw stays randomised inside the under-covered band so slates are not
// predictable.
async function composeSlates(
  supabase: SupabaseClient,
  result: CollectResult
): Promise<number> {
  const { data: dims } = await supabase.from("dimensions").select("id");
  if (!dims?.length) return 0;

  const canSoftDelete = await hasCapability(supabase, "slateServing");
  const cutoff = new Date(
    Date.now() - config.slateRetentionDays * 86_400_000
  ).toISOString();

  // NON-DESTRUCTIVE RETIREMENT.
  // This used to be `slates.delete().lt(created_at, cutoff)` — and slates
  // cascade-delete their votes. A year-old slate held a year of community
  // judgement, and the nightly cron was quietly incinerating it. Now the slate
  // is only taken out of rotation; the votes and the evidence they carry stay.
  if (canSoftDelete) {
    const { error } = await supabase
      .from("slates")
      .update({ active: false })
      .lt("created_at", cutoff)
      .eq("active", true);
    if (error) result.errors.push(`retire slates: ${error.message}`);
  }

  // Retire statements past the retention window from the active pool. Already
  // non-destructive: the row and its history stay, it just stops being slated.
  await supabase
    .from("statements")
    .update({ active: false })
    .lt("harvested_at", cutoff)
    .eq("active", true);

  // Stop composing once there are plenty of fresh slates in rotation, so the
  // cron cannot balloon the pool faster than voters can work through it.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count: existingRecent } = await supabase
    .from("slates")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);
  if ((existingRecent ?? 0) >= config.recentSlateCeiling) return 0;

  // --- Load the FULL corpus (paged past the 1000-row cap) ------------------
  const stmts = await selectAll<{ id: string; channel_id: string }>(
    () => supabase.from("statements").select("id, channel_id").eq("active", true),
    "load statements"
  );
  if (stmts.length < 4) return 0;

  const existingSlates = await selectAll<{
    dimension_id: number;
    kind: string;
    statement_ids: string[];
  }>(
    () => supabase.from("slates").select("dimension_id, kind, statement_ids"),
    "load slates"
  );

  const existingSignatures = new Set<string>();
  const queued = new Map<string, number>(); // statement -> slates awaiting votes
  for (const s of existingSlates) {
    const ids = (s.statement_ids as string[]) ?? [];
    existingSignatures.add(`${s.kind}:${s.dimension_id}:${[...ids].sort().join(",")}`);
    for (const id of ids) queued.set(id, (queued.get(id) ?? 0) + 1);
  }

  // Votes already received, per statement.
  const scores = await selectAll<{ statement_id: string; shown: number }>(
    () => supabase.from("statement_scores").select("statement_id, shown"),
    "load statement scores"
  );
  const seen = new Map<string, number>();
  for (const s of scores) {
    seen.set(s.statement_id, (seen.get(s.statement_id) ?? 0) + (s.shown ?? 0));
  }

  const pool = buildCoveragePool(stmts, seen, queued);

  let created = 0;
  const pending: {
    kind: string;
    dimension_id: number;
    statement_ids: string[];
    max_pick: number;
  }[] = [];

  for (const dim of dims) {
    for (let i = 0; i < config.topkSlatesPerDim; i++) {
      const ids = drawSlate(pool, 7);
      if (ids.length < 4) continue;
      const sig = `topk:${dim.id}:${[...ids].sort().join(",")}`;
      if (existingSignatures.has(sig)) continue;
      existingSignatures.add(sig);
      pending.push({
        kind: "topk",
        dimension_id: dim.id,
        statement_ids: ids,
        max_pick: 3,
      });
    }
    for (let i = 0; i < config.pairSlatesPerDim; i++) {
      const ids = drawSlate(pool, 2);
      if (ids.length !== 2) continue;
      const sig = `pairwise:${dim.id}:${[...ids].sort().join(",")}`;
      if (existingSignatures.has(sig)) continue;
      existingSignatures.add(sig);
      pending.push({
        kind: "pairwise",
        dimension_id: dim.id,
        statement_ids: ids,
        max_pick: 1,
      });
    }
  }

  // One batched insert instead of one round-trip per slate.
  for (let i = 0; i < pending.length; i += 100) {
    const chunk = pending.slice(i, i + 100);
    const { error } = await supabase.from("slates").insert(chunk);
    if (error) result.errors.push(`insert slates: ${error.message}`);
    else created += chunk.length;
  }

  result.slatesCreated = created;
  return created;
}

export interface PoolStatement {
  id: string;
  load: number;
}
export interface PoolChannel {
  channelId: string;
  statements: PoolStatement[];
  /** TOTAL load across the channel's statements — see buildCoveragePool. */
  load: number;
}

/**
 * Coverage load = impressions already collected + queued-but-unvoted slates.
 * A statement sitting in five unvoted slates is about to get five impressions,
 * so it should not be queued a sixth time ahead of one nobody has ever shown.
 *
 * A channel's load is the SUM over its statements, not the mean. The ranking
 * threshold a channel has to clear is total exposure, so equalising totals is
 * what actually gets every channel onto the leaderboard. Using the mean instead
 * makes a channel with three statements look as well-covered as one with
 * thirty, and starves exactly the small channels that need the impressions most.
 */
export function buildCoveragePool(
  stmts: { id: string; channel_id: string }[],
  seen: Map<string, number>,
  queued: Map<string, number>
): PoolChannel[] {
  const byChannel = new Map<string, PoolStatement[]>();
  for (const s of stmts) {
    const load = (seen.get(s.id) ?? 0) + (queued.get(s.id) ?? 0);
    const list = byChannel.get(s.channel_id) ?? [];
    list.push({ id: s.id, load });
    byChannel.set(s.channel_id, list);
  }
  const pool: PoolChannel[] = [];
  for (const [channelId, statements] of byChannel) {
    statements.sort((a, b) => a.load - b.load);
    const load = statements.reduce((a, s) => a + s.load, 0);
    pool.push({ channelId, statements, load });
  }
  return pool;
}

/**
 * Draw n statements, at most one per channel, biased toward the least-covered
 * channels and their least-covered statements — randomised inside that band so
 * consecutive slates are not identical. Mutates `load` in place so slates built
 * later in the same run avoid what earlier ones just took.
 */
export function drawSlate(pool: PoolChannel[], n: number): string[] {
  if (pool.length < 2) return [];
  pool.sort((a, b) => a.load - b.load);

  // Consider a band a few times wider than the slate so the draw has slack.
  const band = shuffle(pool.slice(0, Math.min(pool.length, Math.max(n * 3, 12))));
  const picked: string[] = [];

  for (const channel of band) {
    if (picked.length >= n) break;
    if (!channel.statements.length) continue;
    // Randomise among this channel's least-covered handful.
    const head = channel.statements.slice(0, Math.min(3, channel.statements.length));
    const chosen = head[Math.floor(Math.random() * head.length)];
    picked.push(chosen.id);

    chosen.load += 1;
    channel.load += 1;
    channel.statements.sort((a, b) => a.load - b.load);
  }
  return picked;
}

/** Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a uniform shuffle. */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isStale(ts: string | null, ttlHours: number): boolean {
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() > ttlHours * 3600_000;
}

async function autoArchiveYearlyRatings(supabase: SupabaseClient) {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Anniversary is June 20th of every year (first archive runs on June 20, 2027)
  const archiveDate = new Date(`${currentYear}-06-20T00:00:00Z`);

  if (now.getTime() >= archiveDate.getTime()) {
    // Check if we already archived this year
    const { count, error: countErr } = await supabase
      .from("yearly_leaderboard_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("archive_year", currentYear);
      
    if (countErr) {
      throw new Error(`check archive: ${countErr.message}`);
    }

    if ((count ?? 0) === 0) {
      console.log(`Auto archiving yearly ratings for ${currentYear}...`);
      // Only rows that actually qualified are worth archiving, and the read is
      // paged so a database past 1000 ratings does not archive a partial year.
      const ratings = await selectAll<any>(
        () =>
          supabase
            .from("channel_ratings")
            .select(
              "channel_id, dimension_id, rating, sigma, n_statements, exposure"
            )
            .eq("ranked", true),
        "fetch ratings"
      );

      if (ratings?.length) {
        const rows = ratings.map((r) => ({
          archive_year: currentYear,
          channel_id: r.channel_id,
          dimension_id: r.dimension_id,
          rating: r.rating,
          sigma: r.sigma,
          n_statements: r.n_statements,
          exposure: r.exposure,
        }));

        const { error: insertErr } = await supabase
          .from("yearly_leaderboard_snapshots")
          .insert(rows);

        if (insertErr) {
          throw new Error(`insert snapshots: ${insertErr.message}`);
        }
      }
    }
  }
}

const JUNK_STATEMENT_REGEXES = [
  /upi\s*id/i,
  /@[a-zA-Z0-9.-]*(ybl|apl|paytm|okaxis|oksbi|okicici|axl|ibl|axisbank|icici|hdfc)\b/i, // common UPI VPA handles
  /support\s*my\s*work/i,
  /support\s*the\s*channel/i,
  /business\s*inquiries/i,
  /business\s*inquiry/i,
  /for\s*business/i,
  /inquiries\s*:/i,
  /inquiry\s*:/i,
  /contact\s*info/i,
  /contact\s*us/i,
  /contact@/i,
  /email\s*:/i,
  /\b[\w.-]+@[\w.-]+\.\w{2,}\b/i, // Standard Email regex
  /follow\s*on/i,
  /follow\s*me/i,
  /facebook\.com/i,
  /twitter\.com/i,
  /instagram\.com/i,
  /patreon\.com/i,
  /telegram\b/i,
  /t\.me\//i,
  /whatsapp/i,
  /subscribe/i,
  /bell\s*icon/i,
  /use\s*code/i,
  /coupon/i,
  /discount/i,
  /buy\s*my/i,
  /merch/i,
  /patron/i,
  /sponsor/i,
  /affiliate/i,
  /click\s*here/i,
  /watch\s*next/i,
  /playlist/i,
  /http[s]?:\/\//i, // Any raw links
  /this\s*video/i,
  /in\s*this\s*video/i,
  /youtube\s*channel/i,
  /news\s*channel/i,
  /welcome\s*to\s*our/i,
  /subscribe\s*to/i,
  /copyright\s*ownership/i,
  /ज़ी\s*न्यूज़/i,
  /आज\s*तक/i,
  /एनडीटीवी/i,
  /रिपब्लिक/i,
  /लल्लनटॉप/i,
  /deshbhakt/i,
  /abp\s*news/i,
  /zee\s*news/i,
  /aaj\s*tak/i,
  /ndtv/i,
  /bbc\s*news/i,
  /reuters/i,
  /editorial\s*focus/i,
  /coverage\s*scope/i,
];

function isJunkStatement(text: string): boolean {
  return JUNK_STATEMENT_REGEXES.some((regex) => regex.test(text));
}
