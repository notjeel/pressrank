import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import { getAIProvider } from "../lib/ai";

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
  const { data: stmts, error: fetchErr } = await supabase
    .from("statements")
    .select("id, text, context");

  if (fetchErr || !stmts) {
    console.error("Error fetching statements:", fetchErr?.message);
    return;
  }

  console.log(`Loaded ${stmts.length} statements. Auditing in batches of 25 using Gemini...`);

  const ai = getAIProvider();
  const idsToDelete: string[] = [];

  // Batch size 25
  const batchSize = 25;
  for (let i = 0; i < stmts.length; i += batchSize) {
    const batch = stmts.slice(i, i + batchSize).map((s) => ({
      id: s.id,
      text: s.text,
      context: s.context,
    }));

    console.log(`Auditing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stmts.length / batchSize)}...`);

    const prompt = `You are auditing a database of news statements for a journalism credibility rating platform.
Identify which of the following statements are TRIVIAL, CASUAL CHATTER, VAGUE VLOGS, PERSONAL TALK, MUSIC, OR OTHER TEXT completely useless for evaluating journalistic credibility, factual precision, sourcing, neutrality, or bias.

Return a JSON array of the IDs that are JUNK, VAGUE, or NON-JOURNALISTIC and should be DELETED.
Do NOT delete actual news reporting, factual claims, or serious political/editorial opinions (even if biased, brief, or controversial). Only delete completely non-journalistic, casual, or trivial statements (e.g. pet interactions, personal chatter, gaming talk, cooking, simple daily logs).

Statements to audit:
${JSON.stringify(batch, null, 2)}

Return ONLY a JSON array of string IDs to delete: ["id1", "id2", ...]`;

    try {
      const result = await ai.json<string[]>(prompt);
      if (Array.isArray(result) && result.length > 0) {
        console.log(`  Flagged ${result.length} statements for deletion in this batch.`);
        for (const id of result) {
          const matched = batch.find((b) => b.id === id);
          if (matched) {
            console.log(`    - [DELETE] "${matched.text}"`);
          }
          idsToDelete.push(id);
        }
      } else {
        console.log("  No statements flagged in this batch.");
      }
    } catch (err) {
      console.error("  AI audit error on batch:", err);
    }
  }

  console.log(`\nTotal statements flagged for deletion: ${idsToDelete.length}`);

  if (idsToDelete.length > 0) {
    console.log(`Deleting flagged statements from database...`);
    const { error: delErr } = await supabase
      .from("statements")
      .delete()
      .in("id", idsToDelete);

    if (delErr) {
      console.error("Failed to delete statements:", delErr.message);
    } else {
      console.log("Successfully deleted all audited junk statements.");
    }
  } else {
    console.log("Database is completely clean! No statements were deleted.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
