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

  console.log("Checking database timestamps to see recent activity...");

  // Latest statement
  const { data: latestStmt, error: stmtErr } = await supabase
    .from("statements")
    .select("harvested_at, text")
    .order("harvested_at", { ascending: false })
    .limit(1);

  if (stmtErr) console.error("Error fetching latest statement:", stmtErr.message);
  else console.log("Latest statement harvested at:", latestStmt?.[0]?.harvested_at, `("${latestStmt?.[0]?.text?.substring(0, 60)}...")`);

  // Latest rating update
  const { data: latestRating, error: ratingErr } = await supabase
    .from("channel_ratings")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (ratingErr) console.error("Error fetching latest rating:", ratingErr.message);
  else console.log("Latest rating recomputed at:", latestRating?.[0]?.updated_at);

  // Latest slate
  const { data: latestSlate, error: slateErr } = await supabase
    .from("slates")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);

  if (slateErr) console.error("Error fetching latest slate:", slateErr.message);
  else console.log("Latest slate composed at:", latestSlate?.[0]?.created_at);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
