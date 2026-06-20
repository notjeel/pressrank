import type { SupabaseClient } from "@supabase/supabase-js";
import { getAIProvider } from "@/lib/ai";
import { config } from "@/lib/config";
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

// ---------- Step 5: compose balanced, randomized slates ----------
async function composeSlates(
  supabase: SupabaseClient,
  result: CollectResult
): Promise<number> {
  const { data: dims } = await supabase.from("dimensions").select("id");
  if (!dims?.length) return 0;

  // Prune slates older than 365 days to keep the database size bounded.
  // This automatically retires old votes (on delete cascade), keeping ratings fresh.
  const oneYearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();
  await supabase.from("slates").delete().lt("created_at", oneYearAgo);

  // Retire statements older than 365 days from the active pool.
  // This keeps the voting pool fresh and relevant while preserving historical vote data.
  await supabase
    .from("statements")
    .update({ active: false })
    .lt("harvested_at", oneYearAgo)
    .eq("active", true);

  // Stop composing if we already have plenty of fresh slates in rotation.
  // This prevents cron spamming while ensuring new slates can always enter.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count: existingRecent } = await supabase
    .from("slates")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);
  if ((existingRecent ?? 0) >= 120) return 0;

  // Pull active statements with their channel so we can enforce ≤1 per channel.
  const { data: stmts } = await supabase
    .from("statements")
    .select("id, channel_id")
    .eq("active", true);
  if (!stmts || stmts.length < 4) return 0;

  // Fetch existing slates to prevent duplicates
  const { data: existingSlates } = await supabase
    .from("slates")
    .select("dimension_id, kind, statement_ids");
  
  const existingSignatures = new Set<string>();
  for (const s of existingSlates ?? []) {
    const sortedIds = [...(s.statement_ids as string[] ?? [])].sort().join(",");
    existingSignatures.add(`${s.kind}:${s.dimension_id}:${sortedIds}`);
  }

  // Several slates per dimension per run, each a fresh randomized draw.
  // Slowed down to 2 TOPK and 1 PAIR per dimension (15 slates total per run)
  // to grow the pool moderately.
  const TOPK_PER_DIM = 2;
  const PAIR_PER_DIM = 1;

  let created = 0;
  for (const dim of dims) {
    for (let i = 0; i < TOPK_PER_DIM; i++) {
      const topk = buildSlate(stmts, 7);
      if (topk.length >= 4) {
        const sortedIds = [...topk].sort().join(",");
        const sig = `topk:${dim.id}:${sortedIds}`;
        if (existingSignatures.has(sig)) continue;
        existingSignatures.add(sig);

        await supabase.from("slates").insert({
          kind: "topk",
          dimension_id: dim.id,
          statement_ids: topk,
          max_pick: 3,
        });
        created += 1;
      }
    }
    for (let i = 0; i < PAIR_PER_DIM; i++) {
      const pair = buildSlate(stmts, 2);
      if (pair.length === 2) {
        const sortedIds = [...pair].sort().join(",");
        const sig = `pairwise:${dim.id}:${sortedIds}`;
        if (existingSignatures.has(sig)) continue;
        existingSignatures.add(sig);

        await supabase.from("slates").insert({
          kind: "pairwise",
          dimension_id: dim.id,
          statement_ids: pair,
          max_pick: 1,
        });
        created += 1;
      }
    }
  }
  result.slatesCreated = created;
  return created;
}

// Pick up to n statements, at most one per channel, randomized.
function buildSlate(
  stmts: { id: string; channel_id: string }[],
  n: number
): string[] {
  const shuffled = [...stmts].sort(() => Math.random() - 0.5);
  const picked: string[] = [];
  const usedChannels = new Set<string>();
  for (const s of shuffled) {
    if (usedChannels.has(s.channel_id)) continue;
    usedChannels.add(s.channel_id);
    picked.push(s.id);
    if (picked.length >= n) break;
  }
  return picked;
}

function isStale(ts: string | null, ttlHours: number): boolean {
  if (!ts) return true;
  return Date.now() - new Date(ts).getTime() > ttlHours * 3600_000;
}
