/**
 * Seeds a starter set of news-spreading channels across mediums.
 * These are intentionally a thin seed — the automated collection pipeline
 * (/api/cron/collect) enriches metadata, fetches reach, and harvests
 * statements. The pipeline can also discover more channels from these seeds.
 *
 * Run: npm run seed   (loads .env.local, uses the service-role key)
 */
import { config } from "dotenv";
// Next.js uses .env.local for secrets; load it (falling back to .env).
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";

const seeds: Array<{
  name: string;
  handle?: string;
  medium: "youtube" | "instagram" | "tv" | "web" | "other";
  entity_type: "org" | "individual";
  youtube_channel_id?: string;
  official_url?: string;
  language?: string;
  country?: string;
}> = [
  // Global / international news orgs
  { name: "BBC News", handle: "@BBCNews", medium: "youtube", entity_type: "org", official_url: "https://www.bbc.com/news", language: "en", country: "GB" },
  { name: "Reuters", handle: "@Reuters", medium: "youtube", entity_type: "org", official_url: "https://www.reuters.com", language: "en", country: "GB" },
  { name: "Associated Press", handle: "@AP", medium: "youtube", entity_type: "org", official_url: "https://apnews.com", language: "en", country: "US" },
  { name: "Al Jazeera English", handle: "@aljazeeraenglish", medium: "youtube", entity_type: "org", official_url: "https://www.aljazeera.com", language: "en", country: "QA" },
  // Digital-native + independent creators
  { name: "Vox", handle: "@Vox", medium: "youtube", entity_type: "org", official_url: "https://www.vox.com", language: "en", country: "US" },
  { name: "Johnny Harris", handle: "@johnnyharris", medium: "youtube", entity_type: "individual", language: "en", country: "US" },
  // India ecosystem (TV + digital, as in the source plan)
  { name: "NDTV", handle: "@ndtv", medium: "youtube", entity_type: "org", official_url: "https://www.ndtv.com", language: "en", country: "IN" },
  { name: "The Lallantop", handle: "@TheLallantop", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Dhruv Rathee", handle: "@dhruvrathee", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Aaj Tak", handle: "@aajtak", medium: "youtube", entity_type: "org", official_url: "https://www.aajtak.in", language: "hi", country: "IN" },
  { name: "WION", handle: "@WION", medium: "youtube", entity_type: "org", official_url: "https://www.wionews.com", language: "en", country: "IN" },
  { name: "India Today", handle: "@indiatoday", medium: "youtube", entity_type: "org", official_url: "https://www.indiatoday.in", language: "en", country: "IN" },
  { name: "Republic World", handle: "@republicworld", medium: "youtube", entity_type: "org", official_url: "https://www.republicworld.com", language: "en", country: "IN" },
  { name: "Zee News", handle: "@ZeeNews", medium: "youtube", entity_type: "org", official_url: "https://zeenews.india.com", language: "hi", country: "IN" },
  { name: "Times Now", handle: "@TimesNow", medium: "youtube", entity_type: "org", official_url: "https://www.timesnownews.com", language: "en", country: "IN" },
  { name: "Ravish Kumar Official", handle: "@RavishKumarOfficial", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Peek TV", handle: "@peektv", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Soch by Mohak Mangal", handle: "@SochbyMohak", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Think School", handle: "@ThinkSchool", medium: "youtube", entity_type: "org", language: "en", country: "IN" },
  { name: "The Deshbhakt", handle: "@thedeshbhakt", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Unfiltered by Samdish", handle: "@UnfilteredbySamdish", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
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

  let inserted = 0;
  for (const s of seeds) {
    // Avoid duplicates on re-run by matching on name.
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("name", s.name)
      .maybeSingle();
    if (existing) continue;

    const { error } = await supabase.from("channels").insert(s);
    if (error) {
      console.error(`Failed to insert ${s.name}:`, error.message);
    } else {
      inserted += 1;
      console.log(`Seeded: ${s.name}`);
    }
  }
  console.log(`\nDone. Inserted ${inserted} new channel(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
