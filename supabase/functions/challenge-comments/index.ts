// The `challenge-comments` resource — the flat discussion thread on a
// challenge. See CLAUDE.md.
//
//   GET    /challenge-comments  ?challengeId=&limit=  → { comments }   only if the caller is a
//     participant of this challenge or its owner — see
//     services/challenge-comments-access-service.ts's checkCanReadComments, the app-layer
//     equivalent of what used to be "Participants and the owner can read a challenge's comments"
//     (20260824000000_challenges.sql)
//   POST   /challenge-comments  { comment }            → { comment }   participant/owner only,
//     and only while comments_enabled — see checkCanPostComment
//   DELETE /challenge-comments/:id                     → { ok: true }  author-only (already
//     self-scoped by `.eq('user_id', userId)`), no moderation yet
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// challenge-comments`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape.
// Route handlers live in `api/`, row mapping in `supabase/dto/`, the real permission checks in
// `services/` — see `notes/index.ts` for the fuller version of this shape, and CLAUDE.md's
// "Authorization: app layer, not RLS" for the rationale.
//
// Deploy: `supabase functions deploy challenge-comments`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/challenge-comments-routes.ts';

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const match = matchRoute(req.method, subPath(url), ROUTES);
  if (!match) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await match.handler({ url, req, db: admin(), userId: auth.user.id, id: match.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[challenge-comments]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
