// The `challenge-participants` resource — who joined a challenge. See
// CLAUDE.md.
//
//   GET    /challenge-participants  ?challengeId=   → { participants }   only if the caller is
//     themselves a participant of this challenge or its owner — see
//     services/challenge-participants-access-service.ts's checkCanReadRoster, the app-layer
//     equivalent of what used to be "Participants can see their challenge's roster"
//     (20260824000000_challenges.sql, including its own is_challenge_participant() helper — that
//     existed only to dodge a self-referencing-RLS-policy recursion error, a purely Postgres-
//     shaped problem this resource no longer has now that the check runs here)
//   POST   /challenge-participants  { participant }  → { participant }   join (upsert on
//     challengeId+caller) — inherently self-scoped, `user_id` is always the caller's own
//     regardless of what's in the body, so there's nothing to compose a `checkPermission` around
//   DELETE /challenge-participants  ?challengeId=    → { ok: true }      leave — same, always
//     the caller's own row
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// challenge-participants`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape.
// Route handlers live in `api/`, the one real permission check in `services/` — see
// `notes/index.ts` for the fuller version of this shape, and CLAUDE.md's "Authorization: app
// layer, not RLS" for the rationale.
//
// Deploy: `supabase functions deploy challenge-participants`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { ROUTES, subPath } from './api/challenge-participants-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const route = ROUTES[`${req.method} ${subPath(url)}`];
  if (!route) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-participants]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
