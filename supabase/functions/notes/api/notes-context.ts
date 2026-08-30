// Small shared bits every notes/api handler needs — the request-scoped ctx shape, and the two
// tiny parsing helpers every route on this resource reaches for. Kept local to this feature
// rather than promoted to `shared/` since nothing outside `notes` needs them yet — see
// CLAUDE.md's "a resource is a thing in the domain" convention for the same "don't share until
// something else actually needs it" reasoning. Mirrors kakaonline's core-server
// features/<domain>/api split, adapted to Supabase's constraint that a function's deploy target
// must stay `index.ts` (see this resource's own index.ts).

import { ApiError } from '../../../shared/cors.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

// `id` is set by the router (see index.ts) for a `/:id` route match — `GET /notes/:id`,
// `DELETE /notes/:id` — undefined for a collection-level route (`GET /`, `POST /`).
export type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string; id?: string };

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

export function limitFrom(url: URL, fallback: number, max: number): number {
  const raw = Number(url.searchParams.get('limit'));
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), max) : fallback;
}
