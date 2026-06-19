import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/arena/next?kind=topk|pairwise&dimension=neutrality
// Returns ONE slate with anonymized statements — no channel, no source. This
// blindness is the core anti-gaming property: you can't boost/brigade what you
// can't see.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") === "pairwise" ? "pairwise" : "topk";
  const dimensionKey = sp.get("dimension");
  const supabase = createSupabaseAdminClient();

  let dimId: number | null = null;
  if (dimensionKey) {
    const { data: dim } = await supabase
      .from("dimensions")
      .select("id")
      .eq("key", dimensionKey)
      .maybeSingle();
    dimId = dim?.id ?? null;
  }

  // Pull a pool of recent slates and choose one at random (unpredictable order
  // kills position/pre-planning attacks).
  let q = supabase
    .from("slates")
    .select("id, kind, dimension_id, statement_ids, max_pick")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(40);
  if (dimId) q = q.eq("dimension_id", dimId);

  const { data: slates } = await q;
  if (!slates?.length) {
    return NextResponse.json(
      { error: "no slates available — run /api/cron/collect first" },
      { status: 404 }
    );
  }
  const slate = slates[Math.floor(Math.random() * slates.length)];

  const { data: dim } = await supabase
    .from("dimensions")
    .select("id, key, label, question")
    .eq("id", slate.dimension_id)
    .maybeSingle();

  // Fetch ONLY text + context — never the channel link.
  const { data: statements } = await supabase
    .from("statements")
    .select("id, text, context")
    .in("id", slate.statement_ids as string[]);

  // Preserve slate order, shuffled, so position can't leak ranking.
  const byId = new Map((statements ?? []).map((s) => [s.id, s]));
  const ordered = (slate.statement_ids as string[])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .sort(() => Math.random() - 0.5);

  return NextResponse.json({
    slate_id: slate.id,
    kind: slate.kind,
    max_pick: slate.max_pick,
    question: dim?.question,
    dimension: dim ? { key: dim.key, label: dim.label } : null,
    statements: ordered,
  });
}
