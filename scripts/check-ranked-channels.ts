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

  console.log("Checking ranked channels on the leaderboard...");
  const { data, error } = await supabase
    .from("channel_ratings")
    .select("channel_id, rating, n_statements, exposure, ranked, channel:channels(name, medium)")
    .eq("ranked", true);

  if (error) {
    console.error("Error fetching ranked ratings:", error.message);
    return;
  }

  console.log("\nRanked Channel Ratings:");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
