// Request-scoped ctx shape + tiny body-parsing helper every note-folders/api handler needs. Kept
// local rather than promoted to `shared/` since nothing outside `note-folders` needs them.

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
