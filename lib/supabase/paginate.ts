// PostgREST caps every `.select()` at `db-max-rows` (1000 by default) and does
// NOT tell you it truncated. Any table that grows past that silently starts
// returning a partial answer — which, for the rating engine, means votes and
// statements that simply vanish from the maths.
//
// `selectAll` pages through a query with `.range()` until it sees a short page,
// so callers get the whole table or an explicit error. Always use this for
// anything that can exceed 1k rows (votes, slates, statements, stats).

const PAGE_SIZE = 1000;
const MAX_PAGES = 500; // 500k-row safety valve so a bad filter can't spin forever

// The builder is deliberately loosely typed: callers pass dynamic `select()`
// strings (columns that only exist after a migration), which the Supabase type
// parser cannot resolve statically.
type PagedQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export async function selectAll<T>(
  build: () => PagedQuery,
  label: string,
  pageSize: number = PAGE_SIZE
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) {
      throw new Error(`${label}: ${error.message}`);
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < pageSize) return out;
  }
  throw new Error(`${label}: exceeded ${MAX_PAGES * pageSize} rows — refusing to page further`);
}

// Upsert in chunks. Supabase rejects very large single payloads, and one huge
// request that fails takes the whole recompute with it.
export async function upsertChunked(
  supabase: any,
  table: string,
  rows: any[],
  onConflict: string,
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) {
      throw new Error(
        `upsert ${table} [${i}..${i + chunk.length}): ${error.message}`
      );
    }
  }
}
