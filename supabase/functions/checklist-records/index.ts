// The `checklist-records` resource — every read and write of a checklist's own fields, number,
// text, date, datetime, or note. See CLAUDE.md.
//
//   GET    /checklist-records  ?checklistTemplateId=&from=&to=&fieldIds=&limit=  → { records }
//   POST   /checklist-records  { records, checklistId, checklistTemplateId, createdAt, submissionId } → { ok }
//   PATCH  /checklist-records/:id { value?, title?, folderId? }                  → { ok }
//   DELETE /checklist-records/:id                                               → { ok }
//
// `checklistTemplateId` is optional on GET — omitted, it reads across every
// template the caller owns.
//
// A `type: 'note'` field's own entry gets a real `checklist_records` row same as every other
// field type's — see 20260829050000_checklist_records_note_id.sql — but with no value of its own
// (`value_number`/`value_text` both null): its real content lives in `notes`, pointed at by
// `note_id`. Both rows share one id (see `fromChecklistFieldNoteEntry`), so `note_id` is always
// that same id, never a separately generated one. This keeps every read here a single
// range-filtered query against `checklist_records` — the list handler resolves the handful of
// referenced notes afterward, by id, rather than running a second range query against `notes` and
// merging results client-side.
//
// This function also owns the `submissions` table's whole lifecycle — POST
// creates the row every record in the batch points at, PATCH bumps its
// `updated_at`. No separate `submissions` resource exists; nothing reads one
// on its own today.
//
// Supabase requires this exact file as the deploy target (`supabase functions deploy
// checklist-records`), so it stays a thin entrypoint: CORS, identity, dispatch, error shape.
// Route handlers live in `api/`, row mapping in `model/` — see `notes/index.ts` for the fuller
// version of this shape.
//
// No `services/` here and no `compose` — every query is already explicitly
// `.eq('user_id', userId)`, own-row-only with no cross-user visibility rule (a challenge
// dashboard's own peer-read of *other* participants' checklist_records happens in
// `challenges/index.ts`, on its own explicit query), so there's nothing for a `checkPermission`
// to decide here (see CLAUDE.md's "Authorization: app layer, not RLS"); just off the RLS-scoped
// client and onto `admin()`.
//
// Deploy: `supabase functions deploy checklist-records`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { matchRoute } from '../../shared/router.ts';
import { ROUTES, subPath } from './api/checklist-records-routes.ts';

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
    console.error('[checklist-records]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
