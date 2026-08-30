// The `challenges` resource — the record that turns a shared checklist
// template into something joinable. See CLAUDE.md.
//
//   GET  /challenges                                  → { challenges }      every challenge the
//     caller owns or has joined — see api/list-my-challenges-handler.ts
//   GET  /challenges  ?checklistTemplateId=          → { challenge }        owner's or a public
//     template's, null if none yet — see api/get-challenge-by-template-handler.ts
//   GET  /challenges/:id  ?from=&to=                 → { challenge, participants, completions,
//     ranking, targets } the dashboard read — see api/get-challenge-dashboard-handler.ts and
//     services/challenges-access-service.ts's checkCanReadDashboard for its two visibility tiers
//   POST /challenges  { challenge }                  → { challenge }        owner-only upsert —
//     see api/save-challenge-handler.ts and services/challenges-access-service.ts's
//     checkCanWriteChallenge
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// challenges`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape. This was
// the resource with the most RLS surface to replicate — see `services/` for the two real
// permission checks, `notes/index.ts` for the fuller version of this `api`/`model`/`services`
// shape, and CLAUDE.md's "Authorization: app layer, not RLS" for the full rationale, including
// the share_records peer-data gate and the pre-existing fieldMeta visibility gap this migration
// preserves rather than changes.
//
// Deploy: `supabase functions deploy challenges`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/challenges-routes.ts';

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
    console.error('[challenges]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
