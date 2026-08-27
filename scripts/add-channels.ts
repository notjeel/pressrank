/**
 * Resolves a curated list of candidate news channels against the YouTube Data
 * API and adds the ones that check out.
 *
 *   npm run add:channels            dry run — resolve and report, write nothing
 *   npm run add:channels -- --apply insert the ones that passed
 *
 * Optional filters:
 *   --min-subs=250000   reach floor (default 200,000)
 *   --max-stale-days=90 must have uploaded within this window (default 120)
 *
 * WHY THIS IS API-VALIDATED RATHER THAN A PLAIN SEED LIST
 * A handle typed from memory is a guess. If it does not resolve, the channel is
 * inserted anyway, `harvestStatements` bails without a `youtube_channel_id`, and
 * it sits on the leaderboard forever contributing nothing — which is how
 * "Prashant Dhawan" ended up pointing at a 121-subscriber @WorldAffairs. So
 * every candidate here is checked against the live API for existence, reach and
 * recent activity BEFORE it is written, and anything that fails is reported
 * rather than silently added.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import {
  fetchRecentVideos,
  fetchYouTubeChannel,
  searchYouTubeChannels,
} from "../lib/collect/youtube";

type Medium = "youtube" | "instagram" | "tv" | "web" | "other";

interface Candidate {
  name: string;
  /** Primary handle guess. */
  handle: string;
  /** Further guesses, tried in order if the primary does not resolve. */
  alt?: string[];
  medium: Medium;
  entity_type: "org" | "individual";
  official_url?: string;
  language?: string;
  country?: string;
}

// ---------------------------------------------------------------------------
// Candidates. Deliberately broad — the API decides what actually gets added.
// Anything already in the database is skipped by name and by resolved channel
// id, so re-running is safe.
// ---------------------------------------------------------------------------
const candidates: Candidate[] = [
  // ─────────── India · newer independent / creator-led news ───────────
  { name: "Akash Banerjee", handle: "@TheDeshBhakt", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Shyam Meera Singh", handle: "@ShyamMeeraSingh", alt: ["@ShyamMeeraSingh1", "@shyammeerasingh_", "@ShyamMeeraSinghOfficial"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Sushant Sinha", handle: "@SushantSinhaOfficial", alt: ["@SushantSinha", "@sushantsinhaofficial"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Punya Prasun Bajpai", handle: "@punyaprasunbajpai", alt: ["@PunyaPrasunBajpai", "@ppbajpai", "@punyaprasunbajpaiofficial"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Sudhir Chaudhary", handle: "@sudhirchaudhary", alt: ["@SudhirChaudharyOfficial", "@BlackAndWhiteWithSudhir", "@sudhirchaudhary_"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Saurabh Dwivedi", handle: "@SaurabhDwivedi", alt: ["@SaurabhDwivediOfficial", "@saurabhdwivedi_"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Deepak Sharma", handle: "@DeepakSharmaOfficial", alt: ["@DeepakSharmaJournalist", "@deepaksharmanews"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Ashutosh", handle: "@AshutoshLIVE", alt: ["@AshutoshOfficial", "@ashutosh_journalist"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Ajit Bharti", handle: "@AjeetBharti", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Rajat Sharma", handle: "@RajatSharmaOfficial", alt: ["@RajatSharmaLive", "@AapKiAdalat", "@RajatSharmaIndiaTV"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Arfa Khanum Sherwani", handle: "@ArfaKhanumSherwani", alt: ["@ArfaKhanum", "@arfakhanumsherwani_"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Ravish Kumar", handle: "@ravishkumar", alt: ["@ravishkumar_official", "@RavishKumarLive"], medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Kunal Kamra", handle: "@kunalkamra", medium: "youtube", entity_type: "individual", language: "hi", country: "IN" },
  { name: "Meghnad S", handle: "@MeghnadS", alt: ["@MeghnadSays", "@meghnad_s", "@Meghnad"], medium: "youtube", entity_type: "individual", language: "en", country: "IN" },
    { name: "The Neon Show", handle: "@TheNeonShow", alt: ["@TheNeonShowPodcast", "@neon_show", "@NeonShowOfficial"], medium: "youtube", entity_type: "org", language: "en", country: "IN" },
  { name: "4PM News Network", handle: "@4pmnews", alt: ["@4PMNews", "@4pmnewsnetwork", "@sanjaysharma4pm"], medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "National Dastak", handle: "@NationalDastak", alt: ["@nationaldastakofficial", "@NationalDastakNews", "@NationalDastak1"], medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Bharat Samachar", handle: "@BharatSamacharTV", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "The Red Mike", handle: "@TheRedMike", alt: ["@TheRedMikeOfficial", "@theredmike_"], medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "News Arena India", handle: "@NewsArenaIndia", alt: ["@NewsArenaIndiaOfficial", "@newsarena_india"], medium: "youtube", entity_type: "org", language: "en", country: "IN" },

  // ─────────── India · fact-checking ───────────
  { name: "Alt News", handle: "@AltNews", alt: ["@AltNewsIn", "@altnews_in", "@AltNewsIndia"], medium: "youtube", entity_type: "org", official_url: "https://www.altnews.in", language: "en", country: "IN" },
  { name: "BOOM", handle: "@BoomLiveIn", alt: ["@BOOMLive", "@boomlive_in", "@BoomFactCheck"], medium: "youtube", entity_type: "org", official_url: "https://www.boomlive.in", language: "en", country: "IN" },

  // ─────────── India · print / digital newsrooms not yet covered ───────────
  { name: "The Hindu", handle: "@TheHindu", alt: ["@thehinduofficial", "@TheHinduVideos", "@TheHinduNews"], medium: "youtube", entity_type: "org", official_url: "https://www.thehindu.com", language: "en", country: "IN" },
  { name: "The Times of India", handle: "@TimesOfIndia", medium: "youtube", entity_type: "org", official_url: "https://timesofindia.indiatimes.com", language: "en", country: "IN" },
  { name: "Mint", handle: "@livemint", medium: "youtube", entity_type: "org", official_url: "https://www.livemint.com", language: "en", country: "IN" },
  { name: "Business Standard", handle: "@bsindia", alt: ["@BusinessStandard", "@businessstandardnews", "@BStandardIndia"], medium: "youtube", entity_type: "org", official_url: "https://www.business-standard.com", language: "en", country: "IN" },
  { name: "Moneycontrol", handle: "@moneycontrol", medium: "youtube", entity_type: "org", official_url: "https://www.moneycontrol.com", language: "en", country: "IN" },
  { name: "CNBC-TV18", handle: "@CNBCTV18", alt: ["@CNBCTV18Live", "@cnbctv18news", "@CNBCTV18India"], medium: "youtube", entity_type: "org", official_url: "https://www.cnbctv18.com", language: "en", country: "IN" },
  { name: "The Federal", handle: "@TheFederal", medium: "youtube", entity_type: "org", official_url: "https://thefederal.com", language: "en", country: "IN" },
  { name: "The News Minute", handle: "@TheNewsMinute", medium: "youtube", entity_type: "org", official_url: "https://www.thenewsminute.com", language: "en", country: "IN" },
  { name: "Dainik Bhaskar", handle: "@DainikBhaskar", alt: ["@DainikBhaskarNews", "@bhaskarnews", "@DainikBhaskarOfficial"], medium: "youtube", entity_type: "org", official_url: "https://www.bhaskar.com", language: "hi", country: "IN" },
  { name: "Amar Ujala", handle: "@AmarUjala", medium: "youtube", entity_type: "org", official_url: "https://www.amarujala.com", language: "hi", country: "IN" },
  { name: "Dainik Jagran", handle: "@JagranNews", alt: ["@JagranTV", "@dainikjagran", "@JagranNewsOfficial"], medium: "youtube", entity_type: "org", official_url: "https://www.jagran.com", language: "hi", country: "IN" },

  // ─────────── India · broadcast not yet covered ───────────
  { name: "Bharat Express", handle: "@BharatExpressNews", alt: ["@BharatExpressLive", "@bharatexpressofficial", "@BharatExpressTV"], medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Good News Today", handle: "@GoodNewsToday", alt: ["@GNTTV", "@goodnewstodayofficial", "@GoodNewsTodayTV"], medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "News Nation", handle: "@NewsNationTV", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Republic Bharat", handle: "@RepublicBharat", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Times Now Navbharat", handle: "@TimesNowNavbharat", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },
  { name: "Zee Business", handle: "@ZeeBusiness", medium: "youtube", entity_type: "org", language: "hi", country: "IN" },

  // ─────────── India · regional languages ───────────
  { name: "Asianet News", handle: "@asianetnews", medium: "youtube", entity_type: "org", language: "ml", country: "IN" },
  { name: "Manorama News", handle: "@ManoramaNews", medium: "youtube", entity_type: "org", language: "ml", country: "IN" },
  { name: "TV9 Telugu", handle: "@TV9TeluguLive", medium: "youtube", entity_type: "org", language: "te", country: "IN" },
  { name: "NTV Telugu", handle: "@ntvteluguhd", alt: ["@NTVTelugu", "@ntvteluguofficial", "@ntvteluguindia"], medium: "youtube", entity_type: "org", language: "te", country: "IN" },
  { name: "Sakshi TV", handle: "@SakshiTV", medium: "youtube", entity_type: "org", language: "te", country: "IN" },
  { name: "Puthiya Thalaimurai", handle: "@PuthiyaThalaimuraiTV", medium: "youtube", entity_type: "org", language: "ta", country: "IN" },
  { name: "Thanthi TV", handle: "@ThanthiTV", medium: "youtube", entity_type: "org", language: "ta", country: "IN" },
  { name: "TV9 Kannada", handle: "@TV9Kannada", medium: "youtube", entity_type: "org", language: "kn", country: "IN" },
  { name: "ABP Ananda", handle: "@abpananda", alt: ["@abpanandatv", "@ABPAnandaOfficial", "@abpanandalive"], medium: "youtube", entity_type: "org", language: "bn", country: "IN" },
  { name: "ABP Majha", handle: "@abpmajha", alt: ["@abpmajhatv", "@ABPMajhaOfficial", "@abpmajhalive"], medium: "youtube", entity_type: "org", language: "mr", country: "IN" },
  { name: "TV9 Marathi", handle: "@TV9Marathi", alt: ["@TV9MarathiNews", "@tv9marathilive", "@TV9Marathi1"], medium: "youtube", entity_type: "org", language: "mr", country: "IN" },
  { name: "TV9 Gujarati", handle: "@Tv9Gujarati", alt: ["@Tv9GujaratiNews", "@tv9gujaratilive", "@TV9Gujarati1"], medium: "youtube", entity_type: "org", language: "gu", country: "IN" },

  // ─────────── Global · newer independent outlets ───────────
  { name: "Zeteo", handle: "@zeteo_news", alt: ["@zeteo", "@ZeteoNews", "@zeteomedia"], medium: "youtube", entity_type: "org", official_url: "https://zeteo.com", language: "en", country: "US" },
  { name: "The Bulwark", handle: "@BulwarkMedia", medium: "youtube", entity_type: "org", official_url: "https://www.thebulwark.com", language: "en", country: "US" },
  { name: "Breaking Points", handle: "@breakingpoints", medium: "youtube", entity_type: "org", language: "en", country: "US" },
  { name: "More Perfect Union", handle: "@MorePerfectUnion", medium: "youtube", entity_type: "org", language: "en", country: "US" },
  { name: "The Free Press", handle: "@TheFP", alt: ["@TheFreePress", "@thefreepressnews", "@FreePressMedia"], medium: "youtube", entity_type: "org", official_url: "https://www.thefp.com", language: "en", country: "US" },
  { name: "Megyn Kelly", handle: "@MegynKelly", medium: "youtube", entity_type: "individual", language: "en", country: "US" },
  { name: "Tucker Carlson", handle: "@TuckerCarlson", medium: "youtube", entity_type: "individual", language: "en", country: "US" },
  { name: "Piers Morgan Uncensored", handle: "@PiersMorganUncensored", medium: "youtube", entity_type: "individual", language: "en", country: "GB" },
  { name: "Novara Media", handle: "@NovaraMedia", medium: "youtube", entity_type: "org", official_url: "https://novaramedia.com", language: "en", country: "GB" },
  { name: "Owen Jones", handle: "@OwenJonesTalks", medium: "youtube", entity_type: "individual", language: "en", country: "GB" },
  { name: "TLDR News", handle: "@TLDRnews", medium: "youtube", entity_type: "org", language: "en", country: "GB" },
  { name: "Cleo Abram", handle: "@CleoAbram", medium: "youtube", entity_type: "individual", language: "en", country: "US" },

  // ─────────── Global · established broadcasters / wires ───────────
  { name: "DW News", handle: "@dwnews", medium: "youtube", entity_type: "org", official_url: "https://www.dw.com", language: "en", country: "DE" },
  { name: "France 24 English", handle: "@France24_en", medium: "youtube", entity_type: "org", official_url: "https://www.france24.com", language: "en", country: "FR" },
  { name: "Sky News", handle: "@SkyNews", medium: "youtube", entity_type: "org", official_url: "https://news.sky.com", language: "en", country: "GB" },
  { name: "Channel 4 News", handle: "@Channel4News", medium: "youtube", entity_type: "org", language: "en", country: "GB" },
  { name: "The Guardian", handle: "@guardian", alt: ["@TheGuardian", "@guardiannews", "@GuardianNewsAndMedia"], medium: "youtube", entity_type: "org", official_url: "https://www.theguardian.com", language: "en", country: "GB" },
  { name: "CNN", handle: "@CNN", medium: "youtube", entity_type: "org", official_url: "https://www.cnn.com", language: "en", country: "US" },
  { name: "Fox News", handle: "@FoxNews", medium: "youtube", entity_type: "org", official_url: "https://www.foxnews.com", language: "en", country: "US" },
  { name: "MSNBC", handle: "@msnbc", alt: ["@MSNBCNews", "@msnbcofficial", "@MSNBCTV"], medium: "youtube", entity_type: "org", official_url: "https://www.msnbc.com", language: "en", country: "US" },
  { name: "PBS NewsHour", handle: "@PBSNewsHour", medium: "youtube", entity_type: "org", language: "en", country: "US" },
  { name: "Bloomberg Television", handle: "@markets", medium: "youtube", entity_type: "org", official_url: "https://www.bloomberg.com", language: "en", country: "US" },
  { name: "Financial Times", handle: "@FinancialTimes", medium: "youtube", entity_type: "org", official_url: "https://www.ft.com", language: "en", country: "GB" },
  { name: "The Economist", handle: "@TheEconomist", medium: "youtube", entity_type: "org", official_url: "https://www.economist.com", language: "en", country: "GB" },
  { name: "The New York Times", handle: "@nytimes", medium: "youtube", entity_type: "org", official_url: "https://www.nytimes.com", language: "en", country: "US" },
  { name: "The Washington Post", handle: "@washingtonpost", medium: "youtube", entity_type: "org", official_url: "https://www.washingtonpost.com", language: "en", country: "US" },
  { name: "South China Morning Post", handle: "@scmp", alt: ["@SouthChinaMorningPost", "@scmpnews", "@scmpofficial"], medium: "youtube", entity_type: "org", official_url: "https://www.scmp.com", language: "en", country: "HK" },
  { name: "TRT World", handle: "@trtworld", medium: "youtube", entity_type: "org", official_url: "https://www.trtworld.com", language: "en", country: "TR" },
];

interface Resolved {
  candidate: Candidate;
  handle: string;
  channelId: string;
  title: string;
  subs: number;
  lastUploadDays: number | null;
  via: "handle" | "search";
}

interface Hit {
  yt: NonNullable<Awaited<ReturnType<typeof fetchYouTubeChannel>>>;
  handle: string;
  via: "handle" | "search";
}

/**
 * Try EVERY handle guess and keep the best, rather than the first that happens
 * to resolve.
 *
 * Squatters matter here. `@TheHindu` resolves — to an 87-subscriber account that
 * is not the newspaper. Taking the first resolution would import the squatter
 * and never try `@TheHinduVideos`. So we collect all hits, prefer the ones whose
 * own YouTube title matches the candidate, and among those take the largest.
 */
async function resolveCandidate(
  c: Candidate,
  useSearch: boolean,
  minSubs: number
): Promise<Hit | null> {
  const hits: Hit[] = [];
  const seen = new Set<string>();

  for (const handle of [c.handle, ...(c.alt ?? [])]) {
    const yt = await fetchYouTubeChannel({ handle });
    if (yt && !seen.has(yt.channelId)) {
      seen.add(yt.channelId);
      hits.push({ yt, handle, via: "handle" });
    }
  }

  // Search is fuzzy and costs 100x a handle lookup, so it only runs when no
  // handle guess produced a title-matching channel.
  if (useSearch && !hits.some((h) => titlesMatch(c.name, h.yt.title))) {
    for (const id of await searchYouTubeChannels(c.name, 5)) {
      if (seen.has(id)) continue;
      const yt = await fetchYouTubeChannel({ channelId: id });
      if (!yt) continue;
      seen.add(id);
      // A search hit has no verified handle behind it, so the title must match.
      if (!titlesMatch(c.name, yt.title)) continue;
      hits.push({ yt, handle: c.handle, via: "search" });
    }
  }

  if (!hits.length) return null;

  // Selection order, and every step of it is load-bearing:
  //
  //  1. Reach floor first. Preferring a name match before filtering by reach
  //     let a 4K "Puthiya Thalaimurai Foundation" outrank the actual 16M
  //     "PuthiyathalaimuraiTV" purely on name similarity.
  //  2. A curated handle beats a search hit, always. Search is fuzzy: given
  //     "Asianet News" it returned the 12.5M general-entertainment @asianet and
  //     outranked the correct 11.9M @asianetnews on subscriber count alone.
  //     Search exists only for candidates whose handles all failed.
  //  3. Then prefer a title match, then take the largest.
  const credible = hits.filter((h) => (h.yt.subs ?? 0) >= minSubs);
  const viable = credible.length ? credible : hits;
  const byHandle = viable.filter((h) => h.via === "handle");
  const pool = byHandle.length ? byHandle : viable;
  const matching = pool.filter((h) => titlesMatch(c.name, h.yt.title));
  const best = (matching.length ? matching : pool).reduce((b, h) =>
    (h.yt.subs ?? 0) > (b.yt.subs ?? 0) ? h : b
  );
  // Prefer YouTube's own handle over our guess — a search hit has no handle
  // behind it at all, and a guess that resolved may still not be the canonical one.
  return { ...best, handle: best.yt.handle ?? best.handle };
}

/**
 * Token-set comparison: every meaningful word of the shorter name must appear
 * as a whole word in the longer one.
 *
 * Substring matching was not enough. Normalising "Alt News" gives "alt", and
 * "Altcoin Daily" contains "alt" — so a crypto channel matched a fact-checker.
 * "MSNBC" likewise swallowed "NBC News". Comparing whole tokens rejects both.
 */
function titlesMatch(a: string, b: string): boolean {
  const tokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter(
        (t) =>
          ![
            "official",
            "tv",
            "news",
            "live",
            "channel",
            "network",
            "india",
            "the",
            "hd",
          ].includes(t)
      );

  const x = tokens(a);
  const y = tokens(b);
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  const longSet = new Set(long);
  return short.every((t) => longSet.has(t));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const minSubs = numArg(args, "--min-subs", 200_000);
  const maxStaleDays = numArg(args, "--max-stale-days", 120);
  // Search costs 100 quota units per candidate; opt in explicitly.
  const useSearch = args.includes("--search");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  if (!process.env.YOUTUBE_API_KEY) throw new Error("Missing YOUTUBE_API_KEY");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: existing, error } = await supabase
    .from("channels")
    .select("name, youtube_channel_id");
  if (error) throw new Error(error.message);

  const haveName = new Set(
    (existing ?? []).map((c) => c.name.trim().toLowerCase())
  );
  const haveId = new Set(
    (existing ?? []).map((c) => c.youtube_channel_id).filter(Boolean) as string[]
  );

  const accepted: Resolved[] = [];
  const rejected: { candidate: Candidate; why: string }[] = [];

  for (const c of candidates) {
    if (haveName.has(c.name.trim().toLowerCase())) {
      rejected.push({ candidate: c, why: "already in database (name)" });
      continue;
    }

    const hit = await resolveCandidate(c, useSearch, minSubs);
    if (!hit) {
      rejected.push({ candidate: c, why: "handle does not resolve" });
      continue;
    }
    const { yt, via } = hit;
    if (haveId.has(yt.channelId)) {
      rejected.push({ candidate: c, why: "already in database (channel id)" });
      continue;
    }

    const subs = yt.subs ?? 0;
    if (subs < minSubs) {
      rejected.push({
        candidate: c,
        why:
          `best match "${yt.title}" (${hit.handle}) has only ${fmt(subs)} subs ` +
          `— below the ${fmt(minSubs)} floor, likely not the real channel`,
      });
      continue;
    }

    // Still publishing? A dormant channel harvests nothing worth judging.
    let lastUploadDays: number | null = null;
    if (yt.uploadsPlaylistId) {
      const vids = await fetchRecentVideos(yt.uploadsPlaylistId, 1);
      const published = vids[0]?.publishedAt;
      if (published) {
        lastUploadDays = Math.floor(
          (Date.now() - new Date(published).getTime()) / 86_400_000
        );
      }
    }
    if (lastUploadDays !== null && lastUploadDays > maxStaleDays) {
      rejected.push({
        candidate: c,
        why: `dormant — last upload ${lastUploadDays} days ago`,
      });
      continue;
    }

    accepted.push({
      candidate: c,
      handle: hit.handle,
      channelId: yt.channelId,
      title: yt.title,
      subs,
      lastUploadDays,
      via,
    });
    haveId.add(yt.channelId);
    haveName.add(c.name.trim().toLowerCase());
  }

  accepted.sort((a, b) => b.subs - a.subs);

  console.log(`\nPASSED (${accepted.length}) — resolved, active, >= ${fmt(minSubs)} subs\n`);
  for (const r of accepted) {
    const drift =
      r.title.trim().toLowerCase() !== r.candidate.name.trim().toLowerCase()
        ? `  [YouTube: ${r.title}]`
        : "";
    const mark = r.via === "search" ? " *" : "  ";
    console.log(
      `  ${fmt(r.subs).padStart(8)}${mark}${r.handle.padEnd(26)} ${r.candidate.name}${drift}`
    );
  }

  const notResolved = rejected.filter((r) => r.why === "handle does not resolve");
  const other = rejected.filter((r) => r.why !== "handle does not resolve");

  console.log(`\nHANDLE DID NOT RESOLVE (${notResolved.length}) — not added\n`);
  for (const r of notResolved) {
    console.log(`  ${r.candidate.handle.padEnd(26)} ${r.candidate.name}`);
  }

  console.log(`\nSKIPPED (${other.length})\n`);
  for (const r of other) {
    console.log(`  ${r.candidate.name.padEnd(28)} ${r.why}`);
  }

  if (!apply) {
    console.log(
      `\nDry run — nothing written. Re-run with --apply to insert the ${accepted.length} that passed.\n`
    );
    return;
  }

  let inserted = 0;
  for (const r of accepted) {
    const { error: insErr } = await supabase.from("channels").insert({
      name: r.candidate.name,
      handle: r.handle,
      medium: r.candidate.medium,
      entity_type: r.candidate.entity_type,
      official_url: r.candidate.official_url ?? null,
      language: r.candidate.language ?? null,
      country: r.candidate.country ?? null,
      // Pin the resolved id so collection never has to guess from the handle.
      youtube_channel_id: r.channelId,
    });
    if (insErr) console.error(`  failed ${r.candidate.name}: ${insErr.message}`);
    else {
      inserted += 1;
      console.log(`  added ${r.candidate.name}`);
    }
  }
  console.log(`\nInserted ${inserted} channel(s).`);
  console.log(
    "Run `npm run collect` to harvest their statements, then `npm run recompute`.\n"
  );
}

function numArg(args: string[], flag: string, fallback: number): number {
  const hit = args.find((a) => a.startsWith(flag + "="));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) ? n : fallback;
}

function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
