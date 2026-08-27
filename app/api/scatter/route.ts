import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/paginate";
import { hasCapability } from "@/lib/supabase/capabilities";

export const dynamic = "force-dynamic";

// GET /api/scatter?x=neutrality&y=factual
//   → points for the Bias×Credibility-style map (two rating dimensions)
// GET /api/scatter?x=reach&y=factual
//   → Reach×Trust map (x = latest subs/followers, y = a rating dimension)
//
// Add `&include=ranked` to plot only fully-qualified channels. The default
// includes provisional ones (flagged per point) so the map has shape from day
// one instead of rendering three dots.

interface RatingRow {
  channel_id: string;
  rating: number;
  ranked: boolean;
  provisional?: boolean;
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const x = sp.get("x") || "neutrality";
  const y = sp.get("y") || "factual";
  const rankedOnly = sp.get("include") === "ranked";

  const supabase = createSupabaseAdminClient();
  const canProvisional = await hasCapability(supabase, "ratingProvisional");

  const { data: dims } = await supabase.from("dimensions").select("id, key");
  const dimId = (k: string) => dims?.find((d) => d.key === k)?.id ?? null;

  const cols = canProvisional
    ? "channel_id, rating, ranked, provisional"
    : "channel_id, rating, ranked";

  const loadRatings = (dimensionId: number) =>
    selectAll<RatingRow>(
      () =>
        supabase
          .from("channel_ratings")
          .select(cols)
          .eq("dimension_id", dimensionId),
      "load ratings"
    );

  const eligible = (r: RatingRow) =>
    r.ranked || (!rankedOnly && canProvisional && r.provisional === true);

  // y is always a rating dimension.
  const yId = dimId(y);
  if (!yId) return NextResponse.json({ error: "bad y" }, { status: 400 });

  const yRatings = (await loadRatings(yId)).filter(eligible);
  if (!yRatings.length) {
    return NextResponse.json({ xAxis: x, yAxis: y, points: [] });
  }

  const channels = await selectAll<{
    id: string;
    name: string;
    medium: string;
    logo_url: string | null;
  }>(
    () => supabase.from("channels").select("id, name, medium, logo_url"),
    "load channels"
  );
  const channelById = new Map(channels.map((c) => [c.id, c]));

  const points: any[] = [];

  if (x === "reach") {
    // Latest reach stat per channel. This used to be an unpaginated select over
    // the whole history table — past 1000 rows it silently returned only the
    // newest slice, so older channels lost their reach and vanished from the map.
    const stats = await selectAll<{
      channel_id: string;
      subs: number | null;
      followers: number | null;
      fetched_at: string;
    }>(
      () =>
        supabase
          .from("channel_stats")
          .select("channel_id, subs, followers, fetched_at")
          .order("fetched_at", { ascending: false }),
      "load channel stats"
    );

    const latestReach = new Map<string, number>();
    for (const s of stats) {
      if (!latestReach.has(s.channel_id)) {
        latestReach.set(s.channel_id, s.subs ?? s.followers ?? 0);
      }
    }

    for (const r of yRatings) {
      const reach = latestReach.get(r.channel_id);
      const channel = channelById.get(r.channel_id);
      if (reach == null || !channel) continue;
      points.push({
        channel,
        x: reach,
        y: r.rating,
        provisional: !r.ranked,
      });
    }
    return NextResponse.json({ xAxis: "reach", yAxis: y, points });
  }

  // x is another rating dimension
  const xId = dimId(x);
  if (!xId) return NextResponse.json({ error: "bad x" }, { status: 400 });

  const xMap = new Map(
    (await loadRatings(xId)).filter(eligible).map((r) => [r.channel_id, r])
  );

  for (const r of yRatings) {
    const xr = xMap.get(r.channel_id);
    const channel = channelById.get(r.channel_id);
    if (!xr || !channel) continue;
    points.push({
      channel,
      x: xr.rating,
      y: r.rating,
      provisional: !(r.ranked && xr.ranked),
    });
  }
  return NextResponse.json({ xAxis: x, yAxis: y, points });
}
