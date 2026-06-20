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

  console.log("Checking all slates for broken/missing statements...");

  const { data: slates, error: slatesErr } = await supabase
    .from("slates")
    .select("id, kind, statement_ids");

  if (slatesErr) {
    console.error("Error fetching slates:", slatesErr.message);
    return;
  }

  const { data: statements, error: stmtsErr } = await supabase
    .from("statements")
    .select("id");

  if (stmtsErr) {
    console.error("Error fetching statements:", stmtsErr.message);
    return;
  }

  const existingStatementIds = new Set((statements ?? []).map((s) => s.id));
  const brokenSlateIds: string[] = [];

  for (const s of slates ?? []) {
    const ids = s.statement_ids as string[] ?? [];
    const validCount = ids.filter((id) => existingStatementIds.has(id)).length;
    const minRequired = s.kind === "pairwise" ? 2 : 4;

    if (validCount < minRequired) {
      console.log(`Slate "${s.id}" (${s.kind}) is broken: has ${validCount}/${ids.length} valid statements (needs at least ${minRequired}).`);
      brokenSlateIds.push(s.id);
    }
  }

  console.log(`\nFound ${brokenSlateIds.length} broken slates.`);

  if (brokenSlateIds.length > 0) {
    console.log(`Deleting ${brokenSlateIds.length} broken slates from database...`);
    const { error: delErr } = await supabase
      .from("slates")
      .delete()
      .in("id", brokenSlateIds);

    if (delErr) {
      console.error("Failed to delete broken slates:", delErr.message);
    } else {
      console.log("Successfully deleted all broken slates.");
    }
  } else {
    console.log("No broken slates found in the database!");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
