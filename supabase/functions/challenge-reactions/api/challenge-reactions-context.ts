// Request-scoped ctx shape + tiny body-parsing helper every challenge-reactions/api handler
// needs. No `/:id` route here (unlike challenge-comments' `DELETE /:id`) — every route addresses
// a challenge via `challengeId`, not this resource's own row id.

import { ApiError } from '../../../shared/cors.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}
