import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. SERVER ONLY.
// Used by the collection pipeline and recompute job (cron routes) to write
// channels, statements, scores and ratings.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Bypass Next.js's fetch cache — without this, App Router caches
      // supabase REST GETs and serves stale rows (e.g. an empty leaderboard
      // captured before ratings were computed).
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
