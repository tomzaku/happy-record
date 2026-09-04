// Request-scoped ctx shape + the tiny query-parsing helpers this resource's one route needs. Kept
// local rather than promoted to `shared/` since nothing outside `checklist-logs` needs them — see
// `notes/api/notes-context.ts` for the same reasoning. No `body()` helper here — this resource has
// no write route to parse a body for (see index.ts).

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string; id?: string };

export function limitFrom(url: URL, fallback: number, max: number): number {
  const raw = Number(url.searchParams.get('limit'));
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), max) : fallback;
}

const ACTIONS = ['create', 'update', 'delete'] as const;

/** Which action categories a `GET /checklist-logs` call should include. Each of
 * `create`/`update`/`delete` is included unless the query string says exactly `=false` — matching
 * the client-side `{ create: true, update: true, delete: false }` shape. Missing, `"true"`, or any
 * other value counts as included, so an old/naive caller that sends nothing still gets everything. */
export function actionsFrom(url: URL): string[] {
  return ACTIONS.filter(action => url.searchParams.get(action) !== 'false');
}
