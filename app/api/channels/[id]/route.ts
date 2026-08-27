import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/channels/:id → profile: per-dimension radar data, latest reach,
// recent rated statements. Powers the channel profile page.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseAdminClient();
  const id = params.id;

  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!channel) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [{ data: ratings }, { data: dims }, { data: stats }, { data: statements }] =
    await Promise.all([
      supabase
        .from("channel_ratings")
        .select("dimension_id, rating, sigma, n_statements, exposure, ranked")
        .eq("channel_id", id),
      supabase.from("dimensions").select("id, key, label").order("sort"),
      supabase
        .from("channel_stats")
        .select("subs, views, followers, fetched_at")
        .eq("channel_id", id)
        .order("fetched_at", { ascending: false })
        .limit(1),
      supabase
        .from("statements")
        .select("id, text, source_url, harvested_at")
        .eq("channel_id", id)
        .eq("active", true)
        .order("harvested_at", { ascending: false })
        .limit(10),
    ]);

  const dimById = new Map((dims ?? []).map((d) => [d.id, d]));
  const radar = (ratings ?? [])
    // A row with no evidence behind it is a retired placeholder, not a rating.
    .filter((r: any) => r.exposure > 0)
    .map((r: any) => ({
      dimension: dimById.get(r.dimension_id),
      rating: r.rating,
      sigma: r.sigma,
      // The conservative estimate the leaderboard orders by.
      lower_bound: Math.max(0, Math.round((r.rating - 1.96 * r.sigma) * 10) / 10),
      n_statements: r.n_statements,
      exposure: r.exposure,
      ranked: r.ranked,
      provisional: !r.ranked,
    }))
    .sort(
      (a: any, b: any) => (a.dimension?.id ?? 0) - (b.dimension?.id ?? 0)
    );

  return NextResponse.json({
    channel,
    radar,
    stats: stats?.[0] ?? null,
    statements: statements ?? [],
  });
}
