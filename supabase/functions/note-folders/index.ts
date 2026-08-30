// The `note-folders` resource — every read and write of `note_folders`.
// See CLAUDE.md.
//
//   GET    /note-folders          → { folders }
//   POST   /note-folders  { folder } → { ok }
//   DELETE /note-folders  ?id=       → { ok }
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// note-folders`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape. Route
// handlers live in `api/`, row mapping in `model/` — see `notes/index.ts` for the fuller version
// of this shape.
//
// No `services/` here and no `compose` — every query is already explicitly
// `.eq('user_id', userId)`, own-row-only with no cross-user visibility rule, so there's nothing
// for a `checkPermission` to decide (see CLAUDE.md's "Authorization: app layer, not RLS"); just
// off the RLS-scoped client and onto `admin()`.
//
// Deploy: `supabase functions deploy note-folders`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { ROUTES, subPath } from './api/note-folders-routes.ts';

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
    console.error('[note-folders]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
