import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/leaderboard?dimension=neutrality&medium=youtube&content_type=&lang=
// Returns ranked channels for one dimension, with rating + confidence band.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const dimensionKey = sp.get("dimension") || "neutrality";
  const medium = sp.get("medium");
  const contentType = sp.get("content_type");
  const lang = sp.get("lang");

  const supabase = createSupabaseAdminClient();

  const { data: dim } = await supabase
    .from("dimensions")
    .select("id, key, label")
    .eq("key", dimensionKey)
    .maybeSingle();
  if (!dim) {
    return NextResponse.json({ error: "unknown dimension" }, { status: 400 });
  }

  let q = supabase
    .from("channel_ratings")
    .select(
      "rating, sigma, n_statements, exposure, channels!inner(id, name, handle, medium, entity_type, content_type, language, country, logo_url, verified)"
    )
    .eq("dimension_id", dim.id)
    .eq("ranked", true)
    .order("rating", { ascending: false })
    .limit(100);

  if (medium) q = q.eq("channels.medium", medium);
  if (contentType) q = q.eq("channels.content_type", contentType);
  if (lang) q = q.eq("channels.language", lang);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((r: any) => ({
    channel: r.channels,
    rating: r.rating,
    sigma: r.sigma,
    n_statements: r.n_statements,
    exposure: r.exposure,
  }));

  return NextResponse.json({ dimension: dim, rows });
}
