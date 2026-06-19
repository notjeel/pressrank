"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Lightweight auth-state hook for the UI (header login pill, vote gating).
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let unsub: (() => void) | undefined;
    try {
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => {
        if (active) {
          setUser(data.user ?? null);
          setLoading(false);
        }
      });
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (active) setUser(session?.user ?? null);
      });
      unsub = () => sub.subscription.unsubscribe();
    } catch {
      // Supabase env not configured (e.g. local without keys) — treat as logged out.
      setLoading(false);
    }
    return () => {
      active = false;
      unsub?.();
    };
  }, []);

  return { user, loading };
}
