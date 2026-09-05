// The `challenge-reactions` resource — a single toggleable like/dislike per (challenge, user).
// See CLAUDE.md.
//
//   GET    /challenge-reactions ?challengeIds=a,b,c  → { reactions }  batch counts + the
//     caller's own reaction, silently dropping any id not visible to the caller (owner, or its
//     template is public) — see services/challenge-reactions-service.ts's listReactionSummaries
//   POST   /challenge-reactions { challengeId, reaction: 'like'|'dislike' } → { ok: true }
//     upserts the caller's own reaction — same visibility rule, but a known-and-invisible id is a
//     403 here (see checkCanReact), not silently dropped
//   DELETE /challenge-reactions ?challengeId=  → { ok: true }  clears the caller's own reaction
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// challenge-reactions`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape. See
// `challenge-comments/index.ts` for the near-identical shape this was built from.
//
// Deploy: `supabase functions deploy challenge-reactions`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/challenge-reactions-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const match = matchRoute(req.method, subPath(url), ROUTES);
  if (!match) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await match.handler({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-reactions]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
