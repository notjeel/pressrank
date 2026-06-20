import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";

const fixes = [
  { name: "Scroll.in", handle: "@ScrollIn" },
  { name: "Abhisar Sharma", handle: "@Abhisar_Sharma" },
  { name: "Hindustan Times", handle: "@HT-Videos" },
  { name: "Soch by Mohak Mangal", handle: "@mohak_mangal" },
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

  for (const f of fixes) {
    console.log(`Fixing channel "${f.name}" to handle "${f.handle}"...`);
    const { data: ch, error: findErr } = await supabase
      .from("channels")
      .select("id")
      .eq("name", f.name)
      .single();

    if (findErr || !ch) {
      console.error(`  Channel not found: ${f.name}`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from("channels")
      .update({
        handle: f.handle,
        youtube_channel_id: null,
        enriched_at: null,
        stats_fetched_at: null,
        statements_fetched_at: null,
        medium: "youtube", // Force to youtube so it triggers stats/statement collection
      })
      .eq("id", ch.id);

    if (updateErr) {
      console.error(`  Failed to update ${f.name}:`, updateErr.message);
    } else {
      console.log(`  Successfully updated ${f.name}`);
    }
  }

  console.log("Done fixing handles.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
