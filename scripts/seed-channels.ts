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
  // Digital-native + independent creators (global)
  { name: "Vox", handle: "@Vox", medium: "youtube", entity_type: "org", official_url: "https://www.vox.com", language: "en", country: "US" },
  { name: "Johnny Harris", handle: "@johnnyharris", medium: "youtube", entity_type: "individual", language: "en", country: "US" },
  // ──────────────── India — Mainstream TV ────────────────
  { name: "NDTV", handle: "@ndtv", medium: "youtube", entity_type: "org", official_url: "https://www.ndtv.com", language: "en", country: "IN" },
  { name: "Aaj Tak", handle: "@aajtak", medium: "youtube", entity_type: "org", official_url: "https://www.aajtak.in", language: "hi", country: "IN" },
  { name: "WION", handle: "@WION", medium: "youtube", entity_type: "org", official_url: "https://www.wionews.com", language: "en", country: "IN" },
  { name: "India Today", handle: "@indiatoday", medium: "youtube", entity_type: "org", official_url: "https://www.indiatoday.in", language: "en", country: "IN" },
  { name: "Republic World", handle: "@republicworld", medium: "youtube", entity_type: "org", official_url: "https://www.republicworld.com", language: "en", country: "IN" },
  { name: "Zee News", handle: "@ZeeNews", medium: "youtube", entity_type: "org", official_url: "https://zeenews.india.com", language: "hi", country: "IN" },
  { name: "Times Now", handle: "@TimesNow", medium: "youtube", entity_type: "org", official_url: "https://www.timesnownews.com", language: "en", country: "IN" },
  { name: "ABP News", handle: "@ABPNews", medium: "youtube", entity_type: "org", official_url: "https://www.abplive.com", language: "hi", country: "IN" },
  { name: "TV9 Bharatvarsh", handle: "@TV9Bharatvarsh", medium: "youtube", entity_type: "org", official_url: "https://www.tv9hindi.com", language: "hi", country: "IN" },
  { name: "News18 India", handle: "@News18India", medium: "youtube", entity_type: "org", official_url: "https://hindi.news18.com", language: "hi", country: "IN" },
  { name: "India TV", handle: "@IndiaTV", medium: "youtube", entity_type: "org", official_url: "https://www.indiatv.in", language: "hi", country: "IN" },
  { name: "NDTV India", handle: "@NDTVIndia", medium: "youtube", entity_type: "org", official_url: "https://ndtv.in", language: "hi", country: "IN" },
  { name: "CNN-News18", handle: "@CNNnews18", medium: "youtube", entity_type: "org", official_url: "https://www.news18.com", language: "en", country: "IN" },
  { name: "Mirror Now", handle: "@MirrorNow", medium: "youtube", entity_type: "org", official_url: "https://www.timesnownews.com/mirror-now", language: "en", country: "IN" },
  { name: "News24", handle: "@newsaborad24x7", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  // ──────────────── India — Digital-first / Print-digital ────────────────
  { name: "The Print", handle: "@ThePrintIndia", medium: "youtube", entity_type: "org", official_url: "https://theprint.in", language: "en", country: "IN" },
  { name: "The Wire", handle: "@thewaborad", medium: "youtube", entity_type: "org", official_url: "https://thewire.in", language: "en", country: "IN" },
  { name: "Newslaundry", handle: "@newslaundry", medium: "youtube", entity_type: "org", official_url: "https://www.newslaundry.com", language: "en", country: "IN" },
  { name: "The Quint", handle: "@TheQuint", medium: "youtube", entity_type: "org", official_url: "https://www.thequint.com", language: "en", country: "IN" },
  { name: "Firstpost", handle: "@Firstpost", medium: "youtube", entity_type: "org", official_url: "https://www.firstpost.com", language: "en", country: "IN" },
  { name: "Scroll.in", handle: "@scroll_in", medium: "youtube", entity_type: "org", official_url: "https://scroll.in", language: "en", country: "IN" },
  { name: "The Indian Express", handle: "@indianexpress", medium: "youtube", entity_type: "org", official_url: "https://indianexpress.com", language: "en", country: "IN" },
  { name: "Hindustan Times", handle: "@htTweets", medium: "youtube", entity_type: "org", official_url: "https://www.hindustantimes.com", language: "en", country: "IN" },
  // ──────────────── India — Independent creators / explainers ────────────────
  { name: "The Lallantop", handle: "@TheLallantop", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Dhruv Rathee", handle: "@dhruvrathee", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Ravish Kumar Official", handle: "@RavishKumarOfficial", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Peek TV", handle: "@peektv", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Soch by Mohak Mangal", handle: "@SochbyMohak", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Think School", handle: "@ThinkSchool", medium: "youtube", entity_type: "org", language: "en", country: "IN" },
  { name: "The Deshbhakt", handle: "@thedeshbhakt", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Unfiltered by Samdish", handle: "@UnfilteredbySamdish", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Akash Banerjee", handle: "@TheAkashBanerjee", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "StudyIQ IAS", handle: "@StudyIQEducation", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Nitish Rajput", handle: "@NitishRajput", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Abhisar Sharma", handle: "@AbhisarSharma", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Faye D'Souza", handle: "@fabordsouza", medium: "youtube", entity_type: "individual", language: "en", country: "IN" },
  { name: "Barkha Dutt", handle: "@ABORDDTV", medium: "youtube", entity_type: "individual", language: "en", country: "IN" },
  { name: "Prashant Dhawan", handle: "@WorldAffairs", medium: "youtube", entity_type: "individual", language: "en", country: "IN" },
  { name: "Kumar Shyam", handle: "@KumarShyam", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Satya Hindi", handle: "@SatyaHindiNews", medium: "youtube", entity_type: "org", official_url: "https://www.satyahindi.com", language: "hi", country: "IN" },
  { name: "Ajit Anjum", handle: "@AjitAnjum", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
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
