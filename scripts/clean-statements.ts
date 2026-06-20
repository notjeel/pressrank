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

  console.log("Cleaning up metadata, transactional, and contact statements...");

  // Select statements containing contact, email, or typical metadata strings
  const patterns = [
    "%contact@%",
    "%business inquiries%",
    "%inquiries :%",
    "%subscribe%",
    "%whatsapp%",
    "%telegram%",
    "%patreon%",
    "%instagram%",
    "%follow me%",
    "%facebook%",
    "%twitter%",
  ];

  let cleanedCount = 0;
  for (const p of patterns) {
    const { data: stmts, error } = await supabase
      .from("statements")
      .select("id, text")
      .ilike("text", p);

    if (error) {
      console.error(`Error querying pattern ${p}:`, error.message);
      continue;
    }

    if (stmts?.length) {
      const ids = stmts.map(s => s.id);
      console.log(`Found ${ids.length} statements matching "${p}". Deactivating/deleting...`);
      
      // We perform delete to fully remove clean-up target issues from slates & databases
      const { error: delErr } = await supabase
        .from("statements")
        .delete()
        .in("id", ids);

      if (delErr) {
        console.error(`Failed to delete statements:`, delErr.message);
      } else {
        cleanedCount += ids.length;
      }
    }
  }

  console.log(`\nSuccessfully cleaned up ${cleanedCount} junk statements.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
