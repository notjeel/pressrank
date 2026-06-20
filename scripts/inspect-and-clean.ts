import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";

// Comprehensive heuristics to identify transactional metadata, links, contact info, and payment details
const junkRegexes = [
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
];

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

  console.log("Fetching all statements from database...");
  const { data: stmts, error } = await supabase
    .from("statements")
    .select("id, text, channel_id, channels(name)");

  if (error) {
    console.error("Error fetching statements:", error.message);
    return;
  }

  console.log(`Analyzing ${stmts?.length} statements...`);

  const junkIds: string[] = [];
  const junkDetails: Array<{ id: string; channel: string; text: string; matchedRegex: string }> = [];

  for (const s of stmts ?? []) {
    const text = s.text ?? "";
    const channelName = (s.channels as any)?.name ?? "Unknown";

    for (const regex of junkRegexes) {
      if (regex.test(text)) {
        junkIds.push(s.id);
        junkDetails.push({
          id: s.id,
          channel: channelName,
          text: text.substring(0, 100),
          matchedRegex: regex.toString(),
        });
        break; // matched one, skip other regexes for this statement
      }
    }
  }

  console.log(`\nFound ${junkIds.length} junk/metadata statements:`);
  for (const jd of junkDetails) {
    console.log(`- Channel: "${jd.channel}" | Pattern: ${jd.matchedRegex}`);
    console.log(`  Text: "${jd.text}"`);
    console.log(`  ID: ${jd.id}\n`);
  }

  if (junkIds.length > 0) {
    console.log(`Deleting ${junkIds.length} statements from database...`);
    const { error: delErr } = await supabase
      .from("statements")
      .delete()
      .in("id", junkIds);

    if (delErr) {
      console.error("Failed to delete statements:", delErr.message);
    } else {
      console.log("Successfully cleaned up the database.");
    }
  } else {
    console.log("No junk or transactional statements found!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
