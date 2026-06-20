import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import { recomputeRatings } from "../lib/rating/engine";

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

  console.log("Starting manual rating recomputation...");
  const result = await recomputeRatings(supabase);
  console.log("Recomputation Result:", JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
