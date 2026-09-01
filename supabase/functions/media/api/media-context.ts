// Request-scoped ctx shape + tiny body-parsing helper every media/api handler needs. Kept local
// rather than promoted to `shared/` since nothing outside this resource needs them — same shape
// as fields/api/fields-context.ts, challenges/api/challenges-context.ts, etc.

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
