import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false },
  });

  // 1. Check duplicate slates
  console.log("Checking for duplicate slates...");
  const { data: slates, error: slatesErr } = await supabase
    .from("slates")
    .select("id, kind, dimension_id, statement_ids");

  if (slatesErr) {
    console.error("Error fetching slates:", slatesErr.message);
    return;
  }

  console.log(`Total slates in DB: ${slates?.length}`);

  const slateGroups = new Map<string, string[]>(); // signature -> ids
  for (const s of slates ?? []) {
    const sortedIds = [...(s.statement_ids as string[] ?? [])].sort().join(",");
    const signature = `${s.kind}:${s.dimension_id}:${sortedIds}`;
    if (!slateGroups.has(signature)) {
      slateGroups.set(signature, []);
    }
    slateGroups.get(signature)!.push(s.id);
  }

  let duplicateCount = 0;
  const duplicateIdsToDelete: string[] = [];
  for (const [sig, ids] of slateGroups.entries()) {
    if (ids.length > 1) {
      console.log(`Duplicate found for signature: ${sig}`);
      console.log(`  IDs: ${ids.join(", ")}`);
      duplicateCount += ids.length - 1;
      // Keep the first one, delete the rest
      duplicateIdsToDelete.push(...ids.slice(1));
    }
  }

  if (duplicateCount > 0) {
    console.log(`Found ${duplicateCount} duplicate slates. Deleting them...`);
    const { error: delErr } = await supabase
      .from("slates")
      .delete()
      .in("id", duplicateIdsToDelete);
    if (delErr) {
      console.error("Error deleting duplicate slates:", delErr.message);
    } else {
      console.log("Successfully deleted duplicate slates.");
    }
  } else {
    console.log("No duplicate slates found!");
  }

  // 2. Check channels with 0 slates
  console.log("\nChecking channels and their statements/slates count...");
  const { data: channels, error: chanErr } = await supabase
    .from("channels")
    .select("id, name");

  if (chanErr) {
    console.error("Error fetching channels:", chanErr.message);
    return;
  }

  const { data: statements, error: stmtErr } = await supabase
    .from("statements")
    .select("id, channel_id, active");

  if (stmtErr) {
    console.error("Error fetching statements:", stmtErr.message);
    return;
  }

  // Reload slates after potential deletions
  const { data: activeSlates } = await supabase
    .from("slates")
    .select("statement_ids");

  const statementInSlateCount = new Map<string, number>(); // statement_id -> count of slates containing it
  for (const s of activeSlates ?? []) {
    for (const stmtId of s.statement_ids as string[] ?? []) {
      statementInSlateCount.set(stmtId, (statementInSlateCount.get(stmtId) ?? 0) + 1);
    }
  }

  const channelStatements = new Map<string, string[]>(); // channel_id -> statement_ids
  const channelActiveStatements = new Map<string, string[]>(); // channel_id -> active statement_ids
  for (const stmt of statements ?? []) {
    if (!channelStatements.has(stmt.channel_id)) {
      channelStatements.set(stmt.channel_id, []);
    }
    channelStatements.get(stmt.channel_id)!.push(stmt.id);

    if (stmt.active) {
      if (!channelActiveStatements.has(stmt.channel_id)) {
        channelActiveStatements.set(stmt.channel_id, []);
      }
      channelActiveStatements.get(stmt.channel_id)!.push(stmt.id);
    }
  }

  let zeroStatementsCount = 0;
  let zeroSlatesCount = 0;
  const zeroStatementChannels: string[] = [];
  const zeroSlateChannels: string[] = [];

  for (const ch of channels ?? []) {
    const stmtIds = channelStatements.get(ch.id) ?? [];
    const activeStmtIds = channelActiveStatements.get(ch.id) ?? [];
    const stmtCount = stmtIds.length;
    const activeStmtCount = activeStmtIds.length;

    let slateAppearances = 0;
    for (const sid of stmtIds) {
      slateAppearances += statementInSlateCount.get(sid) ?? 0;
    }

    if (stmtCount === 0) {
      zeroStatementsCount++;
      zeroStatementChannels.push(ch.name);
    }

    if (slateAppearances === 0) {
      zeroSlatesCount++;
      zeroSlateChannels.push(ch.name);
    }

    console.log(`Channel "${ch.name}": statements=${stmtCount} (active=${activeStmtCount}), appearances in slates=${slateAppearances}`);
  }

  console.log("\nSummary:");
  console.log(`Total channels: ${channels?.length}`);
  console.log(`Channels with 0 statements: ${zeroStatementsCount} (${zeroStatementChannels.join(", ") || "None"})`);
  console.log(`Channels with 0 slates (no appearances in any slates): ${zeroSlatesCount} (${zeroSlateChannels.join(", ") || "None"})`);

  if (zeroStatementsCount > 0) {
    console.log("\nDetails of channels with 0 statements:");
    const { data: zeroChanDetails } = await supabase
      .from("channels")
      .select("name, handle, medium, youtube_channel_id, official_url, statements_fetched_at, enriched_at, stats_fetched_at")
      .in("name", zeroStatementChannels);
    for (const d of zeroChanDetails ?? []) {
      console.log(JSON.stringify(d, null, 2));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
