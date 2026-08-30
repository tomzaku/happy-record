// The `fields` resource — every read and write of the `fields` table. See
// CLAUDE.md.
//
//   GET    /fields                 → { fields }
//   GET    /fields  ?ids=a,b        → { fields }  just those ids, same visibility rule
//   GET    /fields  ?templateId=    → { fields }  every field one already-public checklist
//                                      template's own field_groups reference — see
//                                      api/list-fields-handler.ts
//   POST   /fields  { field }       → { ok }
//   DELETE /fields/:id              → { ok }
//
// GET (unscoped or `?ids=`) returns the caller's own fields *and* anyone's public ones — but
// `visibility: 'public'` is never something a write through this resource can grant anymore (see
// shared/fields.ts's own comment): the only public rows that exist are the three seeded
// defaults (20260821000000_seed_system_fields.sql), written by a migration under the service
// role. A shared checklist template's own (private) fields are resolved a different way —
// `?templateId=` above — authorized by the template being public, not by flipping the field
// itself public for literally everyone on the platform to see in their own field pickers.
//
// Writes stay owner-only — save/delete handlers hardcode `user_id`, nothing to compose a
// `checkPermission` around.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy fields`),
// so it stays a thin entrypoint: CORS, identity, dispatch, error shape. Route handlers live in
// `api/`, the one real permission check in `services/` — see `notes/index.ts` for the fuller
// version of this shape. No `model/` here: `fromRecordField`/`toRecordField` live in
// `shared/fields.ts` since `checklist-records` and `ai-checklist-template` use them too — see
// CLAUDE.md's "Authorization: app layer, not RLS" for the full rationale on all of this.
//
// Deploy: `supabase functions deploy fields`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/fields-routes.ts';

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
    console.error('[fields]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
