/**
 * Audits every channel in the database against the YouTube Data API.
 *
 *   npm run audit:channels           report only, writes nothing
 *   npm run audit:channels -- --fix  apply the corrections table below
 *
 * A channel whose handle does not resolve can never harvest statements
 * (`harvestStatements` bails without a `youtube_channel_id`), so it sits on the
 * leaderboard contributing nothing. Worse is a handle that resolves to the
 * WRONG channel — a squatter or a same-named account — because then a real
 * outlet gets rated on someone else's words. This lists both, and reports live
 * subscriber counts for the ones that work.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import { fetchYouTubeChannel } from "../lib/collect/youtube";

/**
 * Known-bad records and their verified replacements.
 *
 * "Prashant Dhawan" pointed at @WorldAffairs — a 121-subscriber account that
 * happens to share the name of his show. One statement had already been
 * harvested from it and was being rated under his name. The real channel is
 * @worldaffairsunacademy (4.2M).
 *
 * Each correction is re-validated against the API before it is written, and the
 * statements harvested from the wrong channel are DEACTIVATED, not deleted, so
 * the votes cast on them remain auditable.
 */
const corrections: { name: string; handle: string }[] = [
  { name: "Prashant Dhawan", handle: "@worldaffairsunacademy" },
];

/** Below this, a record almost certainly points at an impostor, not the outlet. */
const SUSPICIOUS_SUBS = 10_000;

async function main() {
  const fix = process.argv.includes("--fix");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  if (!process.env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: channels, error } = await supabase
    .from("channels")
    .select("id, name, handle, youtube_channel_id, language, country")
    .order("name");
  if (error) throw new Error(error.message);

  const ok: { name: string; handle: string; subs: number }[] = [];
  const suspicious: { name: string; handle: string; subs: number }[] = [];
  const broken: { name: string; handle: string | null }[] = [];

  for (const ch of channels ?? []) {
    // Prefer the stored channel id — that is what collection actually uses.
    const yt =
      (ch.youtube_channel_id
        ? await fetchYouTubeChannel({ channelId: ch.youtube_channel_id })
        : null) ??
      (ch.handle ? await fetchYouTubeChannel({ handle: ch.handle }) : null);

    if (!yt) {
      broken.push({ name: ch.name, handle: ch.handle });
      continue;
    }
    const row = { name: ch.name, handle: ch.handle ?? "", subs: yt.subs ?? 0 };
    if (row.subs < SUSPICIOUS_SUBS) suspicious.push(row);
    else ok.push(row);
  }

  ok.sort((a, b) => b.subs - a.subs);

  console.log(`\nRESOLVED (${ok.length})\n`);
  for (const c of ok) {
    console.log(`  ${fmt(c.subs).padStart(8)}  ${c.handle.padEnd(30)} ${c.name}`);
  }

  console.log(
    `\nSUSPICIOUS — resolves, but under ${fmt(SUSPICIOUS_SUBS)} subs (${suspicious.length})\n`
  );
  for (const c of suspicious) {
    console.log(`  ${fmt(c.subs).padStart(8)}  ${c.handle.padEnd(30)} ${c.name}`);
  }

  console.log(`\nBROKEN — does not resolve at all (${broken.length})\n`);
  for (const c of broken) {
    console.log(`  ${(c.handle ?? "(no handle)").padEnd(30)} ${c.name}`);
  }

  if (!corrections.length) return;

  console.log(`\nCORRECTIONS (${corrections.length})\n`);
  for (const c of corrections) {
    const target = await fetchYouTubeChannel({ handle: c.handle });
    if (!target) {
      console.log(`  SKIP  ${c.name}: replacement ${c.handle} does not resolve`);
      continue;
    }
    const current = (channels ?? []).find((x) => x.name === c.name);
    if (!current) {
      console.log(`  SKIP  ${c.name}: no such channel in the database`);
      continue;
    }
    if (current.youtube_channel_id === target.channelId) {
      console.log(`  OK    ${c.name}: already points at ${c.handle}`);
      continue;
    }

    console.log(
      `  ${fix ? "FIX  " : "WOULD"} ${c.name}: ${current.handle} -> ${c.handle} (${fmt(target.subs ?? 0)} subs, "${target.title}")`
    );
    if (!fix) continue;

    // Retire what was harvested from the wrong channel. Non-destructive: the
    // rows and any votes against them survive, they just leave the voting pool.
    const { data: stale, error: stErr } = await supabase
      .from("statements")
      .update({ active: false })
      .eq("channel_id", current.id)
      .eq("active", true)
      .select("id");
    if (stErr) console.log(`        statement retire failed: ${stErr.message}`);
    else console.log(`        retired ${stale?.length ?? 0} mis-sourced statement(s)`);

    const { error: upErr } = await supabase
      .from("channels")
      .update({
        handle: target.handle ?? c.handle,
        youtube_channel_id: target.channelId,
        logo_url: target.thumbnail,
        // Clear the bookkeeping so the next collection run re-harvests properly.
        enriched_at: null,
        stats_fetched_at: null,
        statements_fetched_at: null,
      })
      .eq("id", current.id);
    if (upErr) console.log(`        update failed: ${upErr.message}`);
    else console.log(`        repointed to ${target.channelId}`);
  }

  console.log(
    fix
      ? "\nCorrections applied. Run `npm run collect` then `npm run recompute`.\n"
      : "\nDry run — re-run with --fix to apply the corrections above.\n"
  );
}

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
