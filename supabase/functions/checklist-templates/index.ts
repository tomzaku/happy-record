// The `checklist-templates` resource — every read and write of
// `checklist_templates`. See CLAUDE.md.
//
//   GET    /checklist-templates             → { templates }        caller's own, plus any
//     template they've joined a challenge for (see api/list-checklist-templates-handler.ts) —
//     that one always has someone else's `user_id` on it, not the caller's
//   GET    /checklist-templates ?id=        → { templates }        one template,
//     caller's own or anyone's if it's `visibility: 'public'` — this is what backs the
//     `/checklist-template/shared/:id` route (see CLAUDE.md);
//     services/checklist-templates-access-service.ts's checkCanReadTemplateById is what makes a
//     non-owner's lookup return anything at all.
//   POST   /checklist-templates { template } → { ok }
//   PATCH  /checklist-templates { id, ...changes } → { ok }
//   DELETE /checklist-templates  ?id=        → { ok }
//
// field_groups isn't part of this resource anymore — see `field-groups`
// (20260829010000_notes_note_id_ownership.sql). `repeat` isn't a column on this row anymore
// either (see `repeats` — 20260830000000_repeats_table.sql), but it stays part of `template` on
// the wire: every route below fetches/writes the matching `repeats` row alongside its own.
//
// PATCH is also how a challenge participant sets their own reminder time, distinct from the
// owner's — see the update handler's own comment. Everything else here (title, avatar, tags,
// visibility, flagId) stays owner-only, enforced by the `.eq('user_id', userId)` on the actual
// row update.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// checklist-templates`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape.
// Route handlers live in `api/`, row mapping in `model/`, the real permission check + shared
// resolution helpers in `services/` — see `notes/index.ts` for the fuller version of this shape,
// and CLAUDE.md's "Authorization: app layer, not RLS" for the rationale.
//
// Deploy: `supabase functions deploy checklist-templates`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { ROUTES, subPath } from './api/checklist-templates-routes.ts';

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
    console.error('[checklist-templates]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
