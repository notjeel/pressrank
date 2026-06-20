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

  console.log("Updating dimension 'fact_vs_opinion' to 'non_godi_media' in Supabase...");
  const { error } = await supabase
    .from("dimensions")
    .update({
      key: "non_godi_media",
      label: "Non-Godi Media",
      question: "Which statement is most independent of government narrative or establishment propaganda?",
    })
    .eq("key", "fact_vs_opinion");

  if (error) {
    console.error("Failed to update dimension:", error.message);
  } else {
    console.log("Successfully updated dimension in Supabase!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
