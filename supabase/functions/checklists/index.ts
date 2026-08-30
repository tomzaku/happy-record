// The `checklists` resource — every read and write of `checklists` (one
// day's instance of a template). See CLAUDE.md.
//
//   GET    /checklists/:id                                 → { checklists }  one, by id
//   GET    /checklists  ?checklistTemplateId=&from=&to=   → { checklists }
//   POST   /checklists  { checklist }                     → { ok }
//   DELETE /checklists/:id                                  → { ok }
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// checklists`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape. Route
// handlers live in `api/`, row mapping in `supabase/dto/` — see `notes/index.ts` for the fuller version
// of this shape. `/:id` is matched by `shared/router.ts`'s `matchRoute` — a real path segment,
// not `?id=` in the query string (see CLAUDE.md's "Write them as normal REST APIs").
//
// No `services/` here and no `compose` — every query is already explicitly
// `.eq('user_id', userId)`, own-row-only with no cross-user visibility rule (a checklist is one
// user's own day-instance of a template, never shared directly — a challenge dashboard reads
// *checklist_records*, not this table, for peer data; see `challenges/index.ts`), so there's
// nothing for a `checkPermission` to decide (see CLAUDE.md's "Authorization: app layer, not
// RLS"); just off the RLS-scoped client and onto `admin()`.
//
// Deploy: `supabase functions deploy checklists`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/checklists-routes.ts';

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
    console.error('[checklists]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
