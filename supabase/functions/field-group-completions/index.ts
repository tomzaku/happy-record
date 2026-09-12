// The `field-group-completions` resource — every read and write of `field_group_completions`.
// See CLAUDE.md.
//
//   GET    /field-group-completions?checklistId=            → { fieldGroupCompletions }
//   POST   /field-group-completions  { fieldGroupCompletion } → { ok }
//   DELETE /field-group-completions/:id                       → { ok }
//
// Supabase requires this exact file as the deploy target
// (`supabase functions deploy field-group-completions`), so it stays a thin entrypoint: CORS,
// identity, dispatch, error shape. Route handlers live in `api/`, row mapping in `supabase/dto/`
// — see `notes/index.ts` for the fuller version of this shape.
//
// No `services/` compose here — every query is already explicitly `.eq('user_id', userId)`
// (further narrowed by `checklist_id` on the list route), own-row-only with no cross-user
// visibility rule, so there's nothing for a `checkPermission` to decide (see CLAUDE.md's
// "Authorization: app layer, not RLS"); just off the RLS-scoped client and onto `admin()`.
//
// Deploy: `supabase functions deploy field-group-completions`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/field-group-completions-routes.ts';

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
    console.error('[field-group-completions]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
