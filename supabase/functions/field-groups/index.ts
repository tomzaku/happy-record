// The `field-groups` resource — every read and write of `field_groups`. See CLAUDE.md and
// 20260829010000_notes_note_id_ownership.sql for why this moved off
// `checklist_templates.field_groups` jsonb into its own table.
//
//   GET    /field-groups ?checklistTemplateId=   → { fieldGroups }  one template's own groups —
//     the caller's own, or anyone's if that exact template is `visibility: 'public'` (see
//     20260829060000_public_template_field_groups.sql; the shared-template page is what actually
//     relies on this)
//   GET    /field-groups                          → { fieldGroups }  every group across all of
//     the caller's templates — the home page's own schedule-matching needs every template's
//     groups loaded at once (see useChecklistTemplates.tsx's getChecklistTemplateIdsByGivingDate),
//     same "all mine, unscoped" shape flags/note-folders/tags already use. Always the caller's
//     own only, unlike the scoped form above.
//   POST   /field-groups { fieldGroup }           → { ok }   full-row upsert — create, edit,
//     set/clear noteId, or set archivedAt (soft delete; there's no hard-delete route, matching
//     the convention this replaced).
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// field-groups`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape. Route
// handlers live in `api/`, row mapping in `model/`, the real permission check + repeats-attaching
// helper in `services/` — see `notes/index.ts` for the fuller version of this shape, and
// CLAUDE.md's "Authorization: app layer, not RLS" for the rationale.
//
// Deploy: `supabase functions deploy field-groups`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { ROUTES, subPath } from './api/field-groups-routes.ts';

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
    console.error('[field-groups]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
