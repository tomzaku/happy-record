// Request-scoped ctx shape + tiny body-parsing helper every schedule-exceptions/api handler
// needs. Kept local rather than promoted to `shared/` since nothing outside this resource needs
// them — mirrors tags/api/tags-context.ts exactly.

import { ApiError } from '../../../shared/cors.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// `id` is set by the router (see index.ts) for a `/:id` route match.
export type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string; id?: string };

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** `<checklistTemplateId>:<date>` → its two parts, or throws — the shape every route's own `:id`
 * (delete) or body fields (create, which sends them separately) collapse to before deriving the
 * real `schedules`/`schedule_exceptions` row ids server-side. */
export function parseCompositeId(id: string): { checklistTemplateId: string; date: string } {
  const at = id.lastIndexOf(':');
  if (at <= 0 || at === id.length - 1) throw new ApiError(400, 'Malformed exception id.');
  return { checklistTemplateId: id.slice(0, at), date: id.slice(at + 1) };
}
