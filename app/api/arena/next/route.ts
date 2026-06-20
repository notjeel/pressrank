import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

// GET /api/arena/next?kind=topk|pairwise&dimension=neutrality
// Returns ONE slate with anonymized statements — no channel, no source, ever.
// For a logged-in user, slates they have already voted on are excluded, so the
// same person never sees the same slate twice.
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") === "pairwise" ? "pairwise" : "topk";
  const dimensionKey = sp.get("dimension");
  const admin = createSupabaseAdminClient();

  // Who's asking? (optional — reading is open, but we use it to skip seen slates)
  const userClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  // Slates this user has already voted on.
  let votedSlateIds = new Set<string>();
  let votesLeftWeek: number | null = null;
  if (user) {
    const { data: voted } = await admin
      .from("votes")
      .select("slate_id")
      .eq("user_id", user.id);
    votedSlateIds = new Set((voted ?? []).map((v) => v.slate_id as string));

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const { count } = await admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", weekAgo);
    votesLeftWeek = Math.max(0, config.voteLimitPerWeek - (count ?? 0));
  }

  let dimId: number | null = null;
  if (dimensionKey) {
    const { data: dim } = await admin
      .from("dimensions")
      .select("id")
      .eq("key", dimensionKey)
      .maybeSingle();
    dimId = dim?.id ?? null;
  }

  // Pull a generous pool of recent slates, drop ones already seen, pick one at
  // random (unpredictable order kills position/pre-planning attacks).
  let q = admin
    .from("slates")
    .select("id, kind, dimension_id, statement_ids, max_pick")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(200);
  if (dimId) q = q.eq("dimension_id", dimId);

  const { data: slates } = await q;
  const fresh = (slates ?? []).filter((s) => !votedSlateIds.has(s.id as string));

  if (!fresh.length) {
    const exhausted = (slates?.length ?? 0) > 0;
    return NextResponse.json(
      {
        error: exhausted
          ? "You've voted on every available slate — check back as new data comes in daily."
          : "No slates available yet — run /api/cron/collect first.",
        exhausted,
        votesLeftWeek,
      },
      { status: 404 }
    );
  }
  let slate = null;
  let ordered: any[] = [];

  const maxAttempts = 15;
  for (let attempt = 0; attempt < maxAttempts && fresh.length > 0; attempt++) {
    const idx = Math.floor(Math.random() * fresh.length);
    const candidate = fresh[idx];

    const { data: statements } = await admin
      .from("statements")
      .select("id, text, context")
      .in("id", candidate.statement_ids as string[]);

    const byId = new Map((statements ?? []).map((s) => [s.id, s]));
    const matched = (candidate.statement_ids as string[])
      .map((id) => byId.get(id))
      .filter(Boolean);

    const minRequired = candidate.kind === "pairwise" ? 2 : 4;
    if (matched.length >= minRequired) {
      slate = candidate;
      ordered = matched.sort(() => Math.random() - 0.5);
      break;
    } else {
      // Auto-delete the broken slate from DB since some statements are missing
      await admin.from("slates").delete().eq("id", candidate.id);
      fresh.splice(idx, 1);
    }
  }

  if (!slate) {
    return NextResponse.json(
      { error: "No valid slates found. Check back as new data comes in." },
      { status: 404 }
    );
  }

  const { data: dim } = await admin
    .from("dimensions")
    .select("id, key, label, question")
    .eq("id", slate.dimension_id)
    .maybeSingle();

  return NextResponse.json({
    slate_id: slate.id,
    kind: slate.kind,
    max_pick: slate.max_pick,
    question: dim?.question,
    dimension: dim ? { key: dim.key, label: dim.label } : null,
    statements: ordered,
    votesLeftWeek,
  });
}
