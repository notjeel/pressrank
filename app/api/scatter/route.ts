import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/scatter?x=neutrality&y=factual
//   → points for the Bias×Credibility-style map (two rating dimensions)
// GET /api/scatter?x=reach&y=factual
//   → Reach×Trust map (x = latest subs/followers, y = a rating dimension)
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const x = sp.get("x") || "neutrality";
  const y = sp.get("y") || "factual";
  const supabase = createSupabaseAdminClient();

  const { data: dims } = await supabase
    .from("dimensions")
    .select("id, key");
  const dimId = (k: string) => dims?.find((d) => d.key === k)?.id ?? null;

  // y is always a rating dimension.
  const yId = dimId(y);
  if (!yId) return NextResponse.json({ error: "bad y" }, { status: 400 });

  const { data: yRatings } = await supabase
    .from("channel_ratings")
    .select("channel_id, rating, channels!inner(id, name, medium, logo_url)")
    .eq("dimension_id", yId)
    .eq("ranked", true);

  const points: any[] = [];

  if (x === "reach") {
    // x-axis = latest reach stat
    const { data: stats } = await supabase
      .from("channel_stats")
      .select("channel_id, subs, followers, fetched_at")
      .order("fetched_at", { ascending: false });
    const latestReach = new Map<string, number>();
    for (const s of stats ?? []) {
      if (!latestReach.has(s.channel_id))
        latestReach.set(s.channel_id, s.subs ?? s.followers ?? 0);
    }
    for (const r of yRatings ?? []) {
      const reach = latestReach.get(r.channel_id);
      if (reach == null) continue;
      points.push({ channel: r.channels, x: reach, y: r.rating });
    }
    return NextResponse.json({ xAxis: "reach", yAxis: y, points });
  }

  // x is another rating dimension
  const xId = dimId(x);
  if (!xId) return NextResponse.json({ error: "bad x" }, { status: 400 });
  const { data: xRatings } = await supabase
    .from("channel_ratings")
    .select("channel_id, rating")
    .eq("dimension_id", xId)
    .eq("ranked", true);
  const xMap = new Map((xRatings ?? []).map((r) => [r.channel_id, r.rating]));

  for (const r of yRatings ?? []) {
    const xv = xMap.get(r.channel_id);
    if (xv == null) continue;
    points.push({ channel: r.channels, x: xv, y: r.rating });
  }
  return NextResponse.json({ xAxis: x, yAxis: y, points });
}
