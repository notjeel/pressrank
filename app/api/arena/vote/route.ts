import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/api/turnstile";
import { clientIp, rateLimit } from "@/lib/api/rate-limit";
import { computeVoteWeight } from "@/lib/rating/weight";

export const dynamic = "force-dynamic";

// POST /api/arena/vote
// Body: { slate_id, selected_statement_ids[], turnstile_token? }
// Requires auth. Stores an append-only vote (never updated) with a computed
// weight, then returns the REVEAL — which channels the blind picks came from.
export async function POST(req: NextRequest) {
  // 1. Auth
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  // 2. Rate limit (per user)
  const rl = rateLimit(`vote:${user.id}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "slow down" }, { status: 429 });
  }

  // 3. Parse + validate
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

  // 4. Anti-abuse: Turnstile
  const ok = await verifyTurnstile(body?.turnstile_token, clientIp(req));
  if (!ok) {
    return NextResponse.json({ error: "captcha failed" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();

  // 5. Validate slate + selection subset + max_pick
  const { data: slate } = await admin
    .from("slates")
    .select("id, statement_ids, max_pick, dimension_id")
    .eq("id", slateId)
    .maybeSingle();
  if (!slate) {
    return NextResponse.json({ error: "unknown slate" }, { status: 404 });
  }
  const slateSet = new Set(slate.statement_ids as string[]);
  const cleanSelected = [...new Set(selected)].filter((id) =>
    slateSet.has(id)
  );
  if (cleanSelected.length > slate.max_pick) {
    return NextResponse.json(
      { error: `pick at most ${slate.max_pick}` },
      { status: 400 }
    );
  }

  // 6. Compute weight (identity trust from account age; CIB hooks later)
  const { data: profile } = await admin
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .maybeSingle();
  const weight = computeVoteWeight({
    accountCreatedAt: profile?.created_at ?? user.created_at ?? null,
  });

  // 7. Insert the vote AS THE USER (RLS: insert own vote)
  const { error: insErr } = await supabase.from("votes").insert({
    user_id: user.id,
    slate_id: slateId,
    selected_statement_ids: cleanSelected,
    weight,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 8. The reveal — show which channels the blind picks came from.
  const { data: revealRows } = await admin
    .from("statements")
    .select("id, channels!inner(id, name, medium, logo_url)")
    .in("id", slate.statement_ids as string[]);

  const reveal = (revealRows ?? []).map((r: any) => ({
    statement_id: r.id,
    selected: cleanSelected.includes(r.id),
    channel: r.channels,
  }));

  return NextResponse.json({ ok: true, weight, reveal });
}
