import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/api/cron-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runCollection } from "@/lib/collect/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // allow the pipeline time on Vercel

// Fully-automated collection job. Triggered by Vercel Cron (Bearer CRON_SECRET)
// or manually with ?secret=. Enriches metadata, fetches reach, harvests
// provenance-pinned statements, composes slates. Does NOT rate channels.
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
  const limit = Number(new URL(req.url).searchParams.get("limit")) || undefined;
  try {
    const supabase = createSupabaseAdminClient();
    const result = await runCollection(supabase, { limit });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
