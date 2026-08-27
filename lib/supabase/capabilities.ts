import type { SupabaseClient } from "@supabase/supabase-js";

// Migration 0004 adds columns (slates.active, slates.vote_count,
// channel_ratings.provisional, ...) that this code uses. Supabase migrations
// are applied by hand in the SQL editor, so there is a window where the deployed
// code is ahead of the database.
//
// Rather than 500 during that window, every feature that depends on a new column
// probes for it ONCE per process and quietly falls back to the pre-0004
// behaviour. The site keeps working; it just serves slates in the old order and
// omits the provisional flag until the migration lands.

type Probe = { table: string; columns: string[] };

const PROBES = {
  slateServing: { table: "slates", columns: ["active", "vote_count"] },
  ratingProvisional: {
    table: "channel_ratings",
    columns: ["provisional", "n_votes", "chance"],
  },
  statementExpected: {
    table: "statement_scores",
    columns: ["expected", "raw_shown"],
  },
  recomputeLog: { table: "recompute_runs", columns: ["id"] },
} satisfies Record<string, Probe>;

export type Capability = keyof typeof PROBES;

const cache = new Map<Capability, Promise<boolean>>();

export function hasCapability(
  supabase: SupabaseClient,
  cap: Capability
): Promise<boolean> {
  const hit = cache.get(cap);
  if (hit) return hit;

  const probe = PROBES[cap] as Probe;
  const p = Promise.resolve(
    supabase.from(probe.table).select(probe.columns.join(", ")).limit(1)
  ).then(
    ({ error }) => !error,
    () => false
  );

  cache.set(cap, p);
  return p;
}

/** Strip keys the database does not have yet, so an upsert cannot fail on them. */
export function withoutKeys<T extends Record<string, unknown>>(
  rows: T[],
  keys: string[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    for (const k of keys) delete copy[k];
    return copy;
  });
}

/** Test-only: forget probe results (also used by long-lived scripts). */
export function resetCapabilityCache(): void {
  cache.clear();
}
