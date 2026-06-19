import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/api/turnstile";
import { clientIp, rateLimit } from "@/lib/api/rate-limit";
import { computeVoteWeight } from "@/lib/rating/weight";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

// POST /api/arena/vote
// Body: { slate_id, selected_statement_ids[], turnstile_token? }
// Requires auth. Stores an append-only vote (never updated). Sources are NEVER
// revealed — the vote stays fully blind. Returns only how many votes the user
// has left this week/month.
export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  // 2. Burst rate limit (per user)
  const rl = rateLimit(`vote:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  const admin = createSupabaseAdminClient();

  // 3. Weekly / monthly quota (fairness + anti-brigading)
  const quota = await remainingVotes(admin, user.id);
  if (quota.week <= 0 || quota.month <= 0) {
    return NextResponse.json(
      {
        error:
          quota.week <= 0
            ? "weekly vote limit reached"
            : "monthly vote limit reached",
        votesLeftWeek: Math.max(0, quota.week),
        votesLeftMonth: Math.max(0, quota.month),
      },
      { status: 429 }
    );
  }

  // 4. Parse + validate
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }
  const slateId = body?.slate_id as string | undefined;
  const selected = Array.isArray(body?.selected_statement_ids)
    ? (body.selected_statement_ids as string[])
    : [];
  if (!slateId) {
    return NextResponse.json({ error: "slate_id required" }, { status: 400 });
  }

  // 5. Anti-abuse: Turnstile
  const ok = await verifyTurnstile(body?.turnstile_token, clientIp(req));
  if (!ok) {
    return NextResponse.json({ error: "captcha failed" }, { status: 403 });
  }

  // 6. Validate slate + selection subset + max_pick
  const { data: slate } = await admin
    .from("slates")
    .select("id, statement_ids, max_pick, dimension_id")
    .eq("id", slateId)
    .maybeSingle();
  if (!slate) {
    return NextResponse.json({ error: "unknown slate" }, { status: 404 });
  }

  // 7. One vote per slate per user (also prevents re-voting on a seen slate)
  const { count: already } = await admin
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("slate_id", slateId);
  if ((already ?? 0) > 0) {
    return NextResponse.json(
      { error: "already voted on this slate" },
      { status: 409 }
    );
  }

  const slateSet = new Set(slate.statement_ids as string[]);
  const cleanSelected = [...new Set(selected)].filter((id) => slateSet.has(id));
  if (cleanSelected.length > slate.max_pick) {
    return NextResponse.json(
      { error: `pick at most ${slate.max_pick}` },
      { status: 400 }
    );
  }

  // 8. Compute weight (identity trust from account age; CIB hooks later)
  const { data: profile } = await admin
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .maybeSingle();
  const weight = computeVoteWeight({
    accountCreatedAt: profile?.created_at ?? user.created_at ?? null,
  });

  // 9. Insert the vote AS THE USER (RLS: insert own vote)
  const { error: insErr } = await supabase.from("votes").insert({
    user_id: user.id,
    slate_id: slateId,
    selected_statement_ids: cleanSelected,
    weight,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 10. Blind by design: confirm only, never reveal the sources.
  return NextResponse.json({
    ok: true,
    votesLeftWeek: quota.week - 1,
    votesLeftMonth: quota.month - 1,
  });
}

// How many votes the user may still cast this week / month.
async function remainingVotes(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<{ week: number; month: number }> {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(now - 30 * 86_400_000).toISOString();

  const [{ count: wk }, { count: mo }] = await Promise.all([
    admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", weekAgo),
    admin
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthAgo),
  ]);

  return {
    week: config.voteLimitPerWeek - (wk ?? 0),
    month: config.voteLimitPerMonth - (mo ?? 0),
  };
}
