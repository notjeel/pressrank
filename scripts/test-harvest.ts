import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { createClient } from "@supabase/supabase-js";
import { runCollection } from "../lib/collect/pipeline";
import { getAIProvider } from "../lib/ai";
import { fetchYouTubeChannel, fetchRecentVideos, fetchVideoTranscript } from "../lib/collect/youtube";

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

  const name = process.argv[2] || "Abhisar Sharma";
  console.log(`Testing harvesting for channel: ${name}`);

  const { data: ch, error } = await supabase
    .from("channels")
    .select("*")
    .eq("name", name)
    .single();

  if (error || !ch) {
    console.error("Channel not found:", error?.message);
    return;
  }

  console.log("Channel details:", JSON.stringify(ch, null, 2));

  if (!ch.youtube_channel_id) {
    console.log("No youtube_channel_id, attempting to fetch stats/resolve it...");
    const yt = await fetchYouTubeChannel({
      channelId: ch.youtube_channel_id,
      handle: ch.handle,
    });
    console.log("Resolved YouTube channel:", yt);
    if (!yt) {
      console.log("Failed to resolve YouTube channel.");
      return;
    }
    ch.youtube_channel_id = yt.channelId;
  }

  const yt = await fetchYouTubeChannel({ channelId: ch.youtube_channel_id });
  console.log("YouTube Playlist Details:", yt);
  if (!yt?.uploadsPlaylistId) {
    console.log("No uploads playlist ID found.");
    return;
  }

  const videos = [];
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) {
    console.error("YOUTUBE_API_KEY is not defined");
    return;
  }
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: yt.uploadsPlaylistId,
    maxResults: "6",
    key: k,
  });
  console.log("Fetching playlist items from:", `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString().substring(0, 50)}...`);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`);
  if (!res.ok) {
    console.error("Playlist items fetch failed with status:", res.status);
    console.error("Response body:", await res.text());
  } else {
    const data = await res.json();
    console.log("Playlist items API response items count:", data?.items?.length);
    for (const i of data?.items ?? []) {
      videos.push({
        videoId: i?.contentDetails?.videoId,
        title: i?.snippet?.title ?? "",
        description: i?.snippet?.description ?? "",
      });
    }
  }

  console.log(`Fetched ${videos.length} recent videos.`);

  const ai = getAIProvider();

  for (const v of videos) {
    console.log(`\nVideo: ${v.title} (${v.videoId})`);
    console.log(`Description Length: ${v.description.length}`);

    // Try fetching transcript in en
    let transcript = await fetchVideoTranscript(v.videoId);
    console.log(`Transcript (en) Length: ${transcript.length}`);

    // Try fetching transcript in hi if empty
    if (!transcript) {
      try {
        const res = await fetch(`https://video.google.com/timedtext?lang=hi&v=${v.videoId}`);
        if (res.ok) {
          const xml = await res.text();
          transcript = xml
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;#39;/g, "'")
            .replace(/&amp;quot;/g, '"')
            .replace(/&amp;/g, "&")
            .replace(/\s+/g, " ")
            .trim();
          console.log(`Transcript (hi) Length: ${transcript.length}`);
        }
      } catch (err) {
        console.error("Error fetching hi transcript:", err);
      }
    }

    const sourceText = [v.title, v.description, transcript]
      .filter(Boolean)
      .join("\n")
      .trim();

    console.log(`Source text total length: ${sourceText.length}`);
    if (sourceText.length < 80) {
      console.log("Skipping due to text length < 80.");
      continue;
    }

    console.log("Sending to AI extractStatements...");
    try {
      const excerpts = await ai.extractStatements({
        sourceText,
        channelName: ch.name,
        maxStatements: 2,
      });
      console.log("AI Excerpts:", JSON.stringify(excerpts, null, 2));
    } catch (aiErr) {
      console.error("AI error during extraction:", aiErr);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
