// A minimal fake Supabase query builder for unit tests — supports exactly the chain shapes this
// codebase's repository functions use (`.select`/`.eq`/`.in`/`.or`/`.gte`/`.lte`/`.order`/
// `.limit`, resolved either by awaiting the builder directly or via `.maybeSingle()`/`.single()`)
// against a fixed table of canned `{ data, error }` responses. Not a real PostgREST simulator — it
// doesn't interpret filters at all, it just hands back canned responses in call order. Each
// `.from(table)` call consumes the next queued response for that table, so a test whose code path
// queries the same table twice needs two entries in that table's list.

export type FakeResponse = { data: unknown; error: { message: string } | null };

// deno-lint-ignore no-explicit-any
export function fakeSupabase(responses: Record<string, FakeResponse[]>): any {
  const queues = new Map<string, FakeResponse[]>(
    Object.entries(responses).map(([table, list]) => [table, [...list]]),
  );

  const from = (table: string) => {
    const queue = queues.get(table);
    const result: FakeResponse = queue?.length ? queue.shift()! : { data: null, error: null };

    // deno-lint-ignore no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      or: () => builder,
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: () => builder,
      upsert: () => builder,
      update: () => builder,
      delete: () => builder,
      insert: () => builder,
      maybeSingle: () => Promise.resolve(result),
      single: () => Promise.resolve(result),
      // Makes the builder itself awaitable (`await db.from(...).select(...)`), same as the real
      // PostgREST query builder — most repository functions never call `.maybeSingle()`/`.single()`
      // at all, they just `await` the chain directly.
      then: (
        resolve: (r: FakeResponse) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
  };

  return { from };
}
