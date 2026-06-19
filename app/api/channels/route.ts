import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET /api/channels → lightweight list for pickers (compare/share) and for
// deriving leaderboard filter options.
export async function GET() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("channels")
    .select(
      "id, name, handle, medium, entity_type, content_type, language, country, verified"
    )
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ channels: data ?? [] });
}
