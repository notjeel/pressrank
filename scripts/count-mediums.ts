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

  console.log("Fetching channels and counting by medium...");
  const { data: channels, error: chErr } = await supabase
    .from("channels")
    .select("id, name, medium");

  if (chErr) {
    console.error("Error fetching channels:", chErr.message);
    return;
  }

  const mediumCounts: Record<string, number> = {};
  for (const c of channels || []) {
    const med = c.medium || "unknown";
    mediumCounts[med] = (mediumCounts[med] || 0) + 1;
  }

  console.log("\nChannel Counts by Medium:");
  console.log(JSON.stringify(mediumCounts, null, 2));

  // Count how many active statements each medium has.
  const { data: statements, error: stErr } = await supabase
    .from("statements")
    .select("id, channel:channels(medium)")
    .eq("active", true);

  if (stErr) {
    console.error("Error fetching statements:", stErr.message);
    return;
  }

  const statementMediumCounts: Record<string, number> = {};
  for (const s of statements || []) {
    const med = (s.channel as any)?.medium || "unknown";
    statementMediumCounts[med] = (statementMediumCounts[med] || 0) + 1;
  }

  console.log("\nActive Statement Counts by Medium:");
  console.log(JSON.stringify(statementMediumCounts, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
