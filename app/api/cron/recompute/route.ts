import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/api/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { recomputeRatings } from "@/lib/rating/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Replays all votes into shrinkage-adjusted statement scores and rolls them up
// to channel ratings. Triggered by Vercel Cron or manually with ?secret=.
export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createSupabaseAdminClient();
    const result = await recomputeRatings(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
