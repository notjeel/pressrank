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

  if (dimensionKey === "overall") {
    let q = supabase
      .from("channel_ratings")
      .select(
        "rating, sigma, n_statements, exposure, channels!inner(id, name, handle, medium, entity_type, content_type, language, country, logo_url, verified)"
      )
      .eq("ranked", true);

    if (medium) q = q.eq("channels.medium", medium);
    if (contentType) q = q.eq("channels.content_type", contentType);
    if (lang) q = q.eq("channels.language", lang);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const channelMap = new Map<string, {
      channel: any;
      ratings: number[];
      sigmas: number[];
      n_statements: number[];
      exposures: number[];
    }>();

    for (const r of (data as any) ?? []) {
      const cid = r.channels.id;
      if (!channelMap.has(cid)) {
        channelMap.set(cid, {
          channel: r.channels,
          ratings: [],
          sigmas: [],
          n_statements: [],
          exposures: [],
        });
      }
      const entry = channelMap.get(cid)!;
      entry.ratings.push(r.rating);
      entry.sigmas.push(r.sigma);
      entry.n_statements.push(r.n_statements);
      entry.exposures.push(r.exposure);
    }

    const rows = Array.from(channelMap.values()).map((entry) => {
      const ratingsAvg = entry.ratings.reduce((a, b) => a + b, 0) / entry.ratings.length;
      const sigmasAvg = entry.sigmas.reduce((a, b) => a + b, 0) / entry.sigmas.length;
      const nMax = Math.max(...entry.n_statements, 0);
      const expMax = Math.max(...entry.exposures, 0);
      return {
        channel: entry.channel,
        rating: ratingsAvg,
        sigma: sigmasAvg,
        n_statements: nMax,
        exposure: expMax,
      };
    });

    rows.sort((a, b) => b.rating - a.rating);

    return NextResponse.json({
      dimension: { id: 0, key: "overall", label: "Overall Rating" },
      rows,
    });
  }

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
