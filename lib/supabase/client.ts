"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client for the minimal UI (login, reading public data).
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
