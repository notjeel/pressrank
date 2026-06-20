// Thin YouTube Data API v3 client. All calls are best-effort and return null
// on failure so the pipeline degrades gracefully (AI fallback handles gaps).

const API = "https://www.googleapis.com/youtube/v3";

function key(): string | null {
  return process.env.YOUTUBE_API_KEY || null;
}

export interface YTChannel {
  channelId: string;
  title: string;
  subs: number | null;
  views: number | null;
  uploadsPlaylistId: string | null;
  thumbnail: string | null;
}

/** Resolve a handle (e.g. @BBCNews) or channel id to channel stats. */
export async function fetchYouTubeChannel(input: {
  channelId?: string | null;
  handle?: string | null;
}): Promise<YTChannel | null> {
  const k = key();
  if (!k) return null;
  const params = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    key: k,
  });
  if (input.channelId) params.set("id", input.channelId);
  else if (input.handle)
    params.set("forHandle", input.handle.replace(/^@/, ""));
  else return null;

  const res = await fetch(`${API}/channels?${params}`);
  if (!res.ok) return null;
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item) return null;
  return {
    channelId: item.id,
    title: item.snippet?.title ?? "",
    subs: numOrNull(item.statistics?.subscriberCount),
    views: numOrNull(item.statistics?.viewCount),
    uploadsPlaylistId:
      item.contentDetails?.relatedPlaylists?.uploads ?? null,
    thumbnail: item.snippet?.thumbnails?.high?.url ?? null,
  };
}

export interface YTVideo {
  videoId: string;
  title: string;
  description: string;
}

/**
 * Most recent videos from a channel's uploads playlist, with title +
 * description. The snippet text is always available via the Data API and is
 * the reliable corpus for statement harvesting (captions are best-effort).
 */
export async function fetchRecentVideos(
  uploadsPlaylistId: string,
  max = 6
): Promise<YTVideo[]> {
  const k = key();
  if (!k) return [];
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(max),
    key: k,
  });
  const res = await fetch(`${API}/playlistItems?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.items ?? [])
    .map((i: any) => ({
      videoId: i?.contentDetails?.videoId,
      title: i?.snippet?.title ?? "",
      description: i?.snippet?.description ?? "",
    }))
    .filter((v: YTVideo) => v.videoId);
}

/**
 * Fetch a video's caption track text.
 * Note: the official captions.download endpoint requires OAuth ownership, so
 * for a public directory we use the timedtext endpoint as a best-effort
 * fallback. Returns "" if unavailable; the pipeline then skips that video.
 */
export async function fetchVideoTranscript(
  videoId: string
): Promise<string> {
  try {
    let res = await fetch(
      `https://video.google.com/timedtext?lang=en&v=${videoId}`
    );
    let xml = "";
    if (res.ok) {
      xml = await res.text();
    }
    
    // If English transcript is empty/not found, try Hindi fallback
    if (!xml || xml.includes('error="')) {
      res = await fetch(
        `https://video.google.com/timedtext?lang=hi&v=${videoId}`
      );
      if (res.ok) {
        xml = await res.text();
      }
    }

    if (!xml || xml.includes('error="')) return "";

    // Strip XML tags, decode a few entities.
    const text = xml
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;#39;/g, "'")
      .replace(/&amp;quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    return text;
  } catch {
    return "";
  }
}

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
