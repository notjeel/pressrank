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

  console.log("Composing slates for under-represented channels...");

  // 1. Fetch dimensions
  const { data: dims } = await supabase.from("dimensions").select("id");
  if (!dims?.length) {
    console.error("No dimensions found.");
    return;
  }

  // 2. Fetch active statements
  const { data: stmts } = await supabase
    .from("statements")
    .select("id, channel_id")
    .eq("active", true);
  if (!stmts || stmts.length < 4) {
    console.error("Not enough active statements.");
    return;
  }

  // 3. Fetch existing slates to build signatures
  const { data: existingSlates } = await supabase
    .from("slates")
    .select("dimension_id, kind, statement_ids");
  
  const existingSignatures = new Set<string>();
  const statementInSlateCount = new Map<string, number>();

  for (const s of existingSlates ?? []) {
    const sortedIds = [...(s.statement_ids as string[] ?? [])].sort().join(",");
    existingSignatures.add(`${s.kind}:${s.dimension_id}:${sortedIds}`);
    for (const sid of s.statement_ids as string[] ?? []) {
      statementInSlateCount.set(sid, (statementInSlateCount.get(sid) ?? 0) + 1);
    }
  }

  // 4. Fetch channels
  const { data: channels } = await supabase.from("channels").select("id, name");
  if (!channels) return;

  const channelStatements = new Map<string, string[]>();
  for (const stmt of stmts) {
    if (!channelStatements.has(stmt.channel_id)) {
      channelStatements.set(stmt.channel_id, []);
    }
    channelStatements.get(stmt.channel_id)!.push(stmt.id);
  }

  let slatesCreated = 0;

  for (const ch of channels) {
    const stmtIds = channelStatements.get(ch.id) ?? [];
    let appearances = 0;
    for (const sid of stmtIds) {
      appearances += statementInSlateCount.get(sid) ?? 0;
    }

    if (appearances < 3 && stmtIds.length > 0) {
      console.log(`Channel "${ch.name}" has only ${appearances} appearances in slates. Creating specific slates...`);
      
      // We will create 2 topk slates and 2 pairwise slates per dimension containing one of this channel's statements
      for (const dim of dims) {
        // Create topk slates (7 statements total, including 1 from this channel)
        for (let i = 0; i < 2; i++) {
          const chosenStmt = stmtIds[Math.floor(Math.random() * stmtIds.length)];
          const otherStmts = stmts.filter(s => s.channel_id !== ch.id);
          const topk = buildSpecificSlate(chosenStmt, otherStmts, 7);
          if (topk.length >= 4) {
            const sortedIds = [...topk].sort().join(",");
            const sig = `topk:${dim.id}:${sortedIds}`;
            if (!existingSignatures.has(sig)) {
              existingSignatures.add(sig);
              await supabase.from("slates").insert({
                kind: "topk",
                dimension_id: dim.id,
                statement_ids: topk,
                max_pick: 3,
              });
              slatesCreated++;
            }
          }
        }

        // Create pairwise slates (2 statements total, including 1 from this channel)
        for (let i = 0; i < 2; i++) {
          const chosenStmt = stmtIds[Math.floor(Math.random() * stmtIds.length)];
          const otherStmts = stmts.filter(s => s.channel_id !== ch.id);
          const pair = buildSpecificSlate(chosenStmt, otherStmts, 2);
          if (pair.length === 2) {
            const sortedIds = [...pair].sort().join(",");
            const sig = `pairwise:${dim.id}:${sortedIds}`;
            if (!existingSignatures.has(sig)) {
              existingSignatures.add(sig);
              await supabase.from("slates").insert({
                kind: "pairwise",
                dimension_id: dim.id,
                statement_ids: pair,
                max_pick: 1,
              });
              slatesCreated++;
            }
          }
        }
      }
    }
  }

  console.log(`\nSuccessfully created ${slatesCreated} specific slates to ensure coverage.`);
}

function buildSpecificSlate(
  primaryStmtId: string,
  otherStmts: { id: string; channel_id: string }[],
  n: number
): string[] {
  const shuffled = [...otherStmts].sort(() => Math.random() - 0.5);
  const picked: string[] = [primaryStmtId];
  const usedChannels = new Set<string>();
  
  // Find primary statement's channel to avoid duplicate channel
  // We don't have the primary statement's channel_id directly in the function arguments,
  // but it's fine as we already filtered `otherStmts` to not contain the primary channel.
  
  for (const s of shuffled) {
    if (usedChannels.has(s.channel_id)) continue;
    usedChannels.add(s.channel_id);
    picked.push(s.id);
    if (picked.length >= n) break;
  }
  return picked;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
