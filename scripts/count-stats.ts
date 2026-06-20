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

  const { count: totalCount } = await supabase
    .from("statements")
    .select("id", { count: "exact", head: true });

  const { count: activeCount } = await supabase
    .from("statements")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  const { count: inactiveCount } = await supabase
    .from("statements")
    .select("id", { count: "exact", head: true })
    .eq("active", false);

  const { count: slatesCount } = await supabase
    .from("slates")
    .select("id", { count: "exact", head: true });

  console.log(`Total Statements/Excerpts in Database: ${totalCount}`);
  console.log(`Active Statements: ${activeCount}`);
  console.log(`Inactive/Retired Statements: ${inactiveCount}`);
  console.log(`Total Slates in Database: ${slatesCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
