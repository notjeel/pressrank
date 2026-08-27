import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { selectAll } from "@/lib/supabase/paginate";
import { hasCapability } from "@/lib/supabase/capabilities";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

// GET /api/arena/next?kind=topk|pairwise&dimension=neutrality
// Returns ONE slate with anonymized statements — no channel, no source, ever.
// Slates the caller has already voted on are excluded, so nobody sees the same
// slate twice.
//
// SERVING ORDER IS THE POINT. The old version pulled the 200 most RECENT slates
// and picked at random, so the newest slates were re-served forever while
// older ones (1000+ of them) never collected a single vote — which is why
// almost no channel ever reached the exposure threshold.
//
// Now the pool is ordered by LEAST-VOTED-FIRST and the pick is randomised
// inside that under-served band. Evidence spreads evenly across the corpus,
// every channel accumulates exposure at a similar rate, and the order is still
// unpredictable enough to kill position/pre-planning attacks.

interface SlateRow {
  id: string;
  kind: "topk" | "pairwise";
  dimension_id: number;
  statement_ids: string[];
  max_pick: number;
  vote_count?: number;
}

/** How many under-served slates to randomise between. */
const EXPLORE_BAND = 40;
/** How deep to look for under-served slates. */
const CANDIDATE_POOL = 600;
/** Attempts to find a slate whose statements all still exist. */
const MAX_ATTEMPTS = 15;

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

  // Slates this user has already voted on, plus their remaining quota.
  let votedSlateIds = new Set<string>();
  let votesLeftWeek: number | null = null;
  let votesLeftMonth: number | null = null;
  if (user) {
    const voted = await selectAll<{ slate_id: string }>(
      () => admin.from("votes").select("slate_id").eq("user_id", user.id),
      "load voted slates"
    );
    votedSlateIds = new Set(voted.map((v) => v.slate_id));

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ count: wk }, { count: mo }] = await Promise.all([
      admin
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", weekAgo),
      admin
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthAgo),
    ]);
    votesLeftWeek = Math.max(0, config.voteLimitPerWeek - (wk ?? 0));
    votesLeftMonth = Math.max(0, config.voteLimitPerMonth - (mo ?? 0));
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

  const canServeByExposure = await hasCapability(admin, "slateServing");

  let q = admin
    .from("slates")
    .select(
      canServeByExposure
        ? "id, kind, dimension_id, statement_ids, max_pick, vote_count"
        : "id, kind, dimension_id, statement_ids, max_pick"
    )
    .eq("kind", kind);

  if (canServeByExposure) {
    // Under-served first. `active` is the soft-delete flag from migration 0004.
    q = q
      .eq("active", true)
      .order("vote_count", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(CANDIDATE_POOL);
  } else {
    q = q.order("created_at", { ascending: false }).limit(CANDIDATE_POOL);
  }
  if (dimId) q = q.eq("dimension_id", dimId);

  const { data, error } = await q;
  // The select list is chosen at runtime (vote_count only exists after 0004),
  // so the row shape has to be asserted rather than inferred.
  const slates = (data ?? []) as unknown as SlateRow[];
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const fresh = slates.filter((s) => !votedSlateIds.has(s.id));

  if (!fresh.length) {
    const exhausted = slates.length > 0;
    return NextResponse.json(
      {
        error: exhausted
          ? "You've voted on every available slate — check back as new data comes in daily."
          : "No slates available yet — run /api/cron/collect first.",
        exhausted,
        votesLeftWeek,
        votesLeftMonth,
      },
      { status: 404 }
    );
  }

  // Randomise only within the least-served band: even coverage, unpredictable order.
  const band = canServeByExposure
    ? fresh.slice(0, Math.max(EXPLORE_BAND, 1))
    : fresh;

  let slate: SlateRow | null = null;
  let ordered: { id: string; text: string; context: string | null }[] = [];
  const pool = [...band];

  for (let attempt = 0; attempt < MAX_ATTEMPTS && pool.length > 0; attempt++) {
    const idx = Math.floor(Math.random() * pool.length);
    const candidate = pool[idx];

    const { data: statements } = await admin
      .from("statements")
      .select("id, text, context")
      .in("id", candidate.statement_ids);

    const byId = new Map((statements ?? []).map((s) => [s.id, s]));
    const matched = candidate.statement_ids
      .map((id) => byId.get(id))
      .filter(Boolean) as { id: string; text: string; context: string | null }[];

    const minRequired = candidate.kind === "pairwise" ? 2 : 4;
    if (matched.length >= minRequired) {
      slate = candidate;
      ordered = shuffle(matched);
      break;
    }

    // NON-DESTRUCTIVE: a slate whose statements have gone missing is retired,
    // not deleted. Deleting it would cascade away every vote ever cast on it —
    // real, irreplaceable evidence — which is exactly what the old code did.
    if (canServeByExposure) {
      await admin
        .from("slates")
        .update({ active: false })
        .eq("id", candidate.id);
    }
    pool.splice(idx, 1);
  }

  if (!slate) {
    return NextResponse.json(
      {
        error: "No valid slates found. Check back as new data comes in.",
        votesLeftWeek,
        votesLeftMonth,
      },
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
    votesLeftMonth,
  });
}

/** Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a uniform shuffle —
 *  it biases toward the original order, which in a blind test is a real leak. */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
