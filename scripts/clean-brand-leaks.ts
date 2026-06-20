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

  console.log("Fetching channels and statements...");
  const { data: channels, error: chanErr } = await supabase
    .from("channels")
    .select("name, handle");

  const { data: stmts, error: stmtErr } = await supabase
    .from("statements")
    .select("id, text, channel_id, channels(name)");

  if (chanErr || stmtErr) {
    console.error("Error fetching data:", chanErr?.message || stmtErr?.message);
    return;
  }

  console.log(`Analyzing ${stmts?.length} statements for brand leaks and self-descriptions...`);

  // Build a list of brand keywords to look for (lowercased)
  const brandKeywords = new Set<string>();
  for (const c of channels ?? []) {
    const name = c.name.toLowerCase();
    brandKeywords.add(name);
    // Add variations
    brandKeywords.add(name.replace("news", "").trim());
    brandKeywords.add(name.replace("official", "").trim());
    if (c.handle) {
      brandKeywords.add(c.handle.toLowerCase().replace("@", ""));
    }
  }

  // Common Hindi brand names or self-referential terms to check
  const genericSelfKeywords = [
    "welcome to our",
    "subscribe to",
    "youtube channel",
    "news channel",
    "ज़ी न्यूज़",
    "आज तक",
    "एनडीटीवी",
    "रिपब्लिक",
    "वायर",
    "लल्लनटॉप",
    "deshbhakt",
    "abp news",
    "zee news",
    "aaj tak",
    "ndtv",
    "bbc news",
    "reuters",
    "this video",
    "in this video",
    "editorial focus",
    "coverage scope",
  ];

  const leaksToDelete: string[] = [];
  const leakDetails: any[] = [];

  for (const s of stmts ?? []) {
    const text = s.text.toLowerCase();
    const origText = s.text;
    const channelName = (s.channels as any)?.name ?? "Unknown";

    let isLeak = false;
    let matchedReason = "";

    // 1. Check direct brand keyword leaks
    for (const kw of brandKeywords) {
      if (kw.length > 3 && text.includes(kw)) {
        isLeak = true;
        matchedReason = `Mentions brand name: "${kw}"`;
        break;
      }
    }

    // 2. Check generic self-descriptions and common Hindi brand names
    if (!isLeak) {
      for (const kw of genericSelfKeywords) {
        if (text.includes(kw)) {
          isLeak = true;
          matchedReason = `Contains self-referential/brand keyword: "${kw}"`;
          break;
        }
      }
    }

    // 3. Reject statements that describe the channel/video structure (metadata description)
    if (!isLeak) {
      if (
        (text.includes("channel") && text.includes("focus")) ||
        (text.includes("video") && text.includes("describe")) ||
        (text.includes("subscribe") && text.includes("channel"))
      ) {
        isLeak = true;
        matchedReason = `Looks like channel description or metadata`;
      }
    }

    if (isLeak) {
      leaksToDelete.push(s.id);
      leakDetails.push({
        id: s.id,
        channel: channelName,
        text: origText,
        reason: matchedReason,
      });
    }
  }

  console.log(`\nFound ${leaksToDelete.length} brand leaks / self-descriptions to delete:`);
  for (const ld of leakDetails) {
    console.log(`- Channel: "${ld.channel}" | Reason: ${ld.reason}`);
    console.log(`  Text: "${ld.text}"`);
    console.log(`  ID: ${ld.id}\n`);
  }

  if (leaksToDelete.length > 0) {
    console.log(`Deleting ${leaksToDelete.length} statements from database...`);
    const { error: delErr } = await supabase
      .from("statements")
      .delete()
      .in("id", leaksToDelete);

    if (delErr) {
      console.error("Failed to delete statements:", delErr.message);
    } else {
      console.log("Successfully cleaned up all brand leaks and self-descriptions.");
    }
  } else {
    console.log("No brand leaks or self-descriptions found!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
