// The `checklist-records` resource — every read and write of
// `checklist_records`, what "Submit" writes on the detail-task-page and the
// hot path for every history/chart read there. See CLAUDE.md.
//
//   GET    /checklist-records  ?checklistTemplateId=&from=&to=&fieldIds=&limit=  → { records }
//   POST   /checklist-records  { records, checklistId, checklistTemplateId, createdAt, submissionId } → { ok }
//   PATCH  /checklist-records  { id, value, folderId? }                          → { ok }
//   DELETE /checklist-records  ?id=                                             → { ok }
//
// `checklistTemplateId` is optional on GET — omitted, it reads across every
// template the caller owns (packages/global/src/store/note/useNoteRecord.tsx
// does this; notes are checklist records under the hood too).
//
// This function also owns the `submissions` table's whole lifecycle — POST
// creates the row every record in the batch points at, PATCH bumps its
// `updated_at`. No separate `submissions` resource exists; nothing reads one
// on its own today.
//
// Deploy: `supabase functions deploy checklist-records`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromRecordEntry, limitOf, MAX_BULK, toChecklistRecord } from '../_shared/checklistRecords.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_PAGE = 1000;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ url, db, userId }: Ctx) {
  const templateId = url.searchParams.get('checklistTemplateId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const fieldIds = (url.searchParams.get('fieldIds') ?? '').split(',').filter(Boolean);
  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_PAGE);

  let q = db
    .from('checklist_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (templateId) q = q.eq('checklist_template_id', templateId);
  if (from) q = q.gte('created_at', from);
  if (to) q = q.lte('created_at', to);
  if (fieldIds.length) q = q.in('field_id', fieldIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { records: ((data ?? []) as Record<string, unknown>[]).map(toChecklistRecord) };
}

/**
 * Bulk-writes one submit's worth of fields — `RecordDayEdit`'s Submit button
 * sends every field on the day's form in one call, matching
 * `addChecklistRecord`'s batch shape. Creates the owning `submissions` row
 * first — `checklist_records.submission_id` is a real foreign key, so the
 * parent has to exist before anything can reference it.
 */
async function save({ req, db, userId }: Ctx) {
  const params = await body(req);
  const { checklistId, checklistTemplateId, createdAt, submissionId } = params as Record<string, unknown>;
  if (typeof checklistId !== 'string' || !checklistId) throw new ApiError(400, 'Missing checklistId.');
  if (typeof checklistTemplateId !== 'string' || !checklistTemplateId) {
    throw new ApiError(400, 'Missing checklistTemplateId.');
  }
  if (typeof createdAt !== 'string' || !createdAt) throw new ApiError(400, 'Missing createdAt.');
  if (typeof submissionId !== 'string' || !submissionId) throw new ApiError(400, 'Missing submissionId.');

  const entries = Array.isArray(params.records) ? params.records : [];
  if (!entries.length) return { ok: true };
  if (entries.length > MAX_BULK) throw new ApiError(400, `At most ${MAX_BULK} records per submit.`);

  let rows: ReturnType<typeof fromRecordEntry>[];
  try {
    rows = entries.map(e =>
      fromRecordEntry(e as Record<string, unknown>, { checklistId, checklistTemplateId, createdAt, submissionId }),
    );
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid record.');
  }

  const { error: submissionError } = await db.from('submissions').upsert({
    id: submissionId,
    user_id: userId,
    checklist_id: checklistId,
    checklist_template_id: checklistTemplateId,
    created_at: createdAt,
  });
  if (submissionError) throw new Error(submissionError.message);

  const { error } = await db.from('checklist_records').upsert(rows.map(row => ({ user_id: userId, ...row })));
  if (error) throw new Error(error.message);
  return { ok: true };
}

/**
 * Edits one record's value in place — the metric-field inline editor. Also
 * bumps the owning submission's `updated_at`: a submission has no fields of
 * its own to edit, so this is the only thing that ever changes it after
 * it's created.
 */
async function update({ req, db, userId }: Ctx) {
  const params = await body(req);
  if (typeof params.id !== 'string' || !params.id) throw new ApiError(400, 'Missing id.');
  if (typeof params.value !== 'number' && typeof params.value !== 'string') throw new ApiError(400, 'Missing value.');

  const patch: Record<string, unknown> = {
    value_number: typeof params.value === 'number' ? params.value : null,
    value_text: typeof params.value === 'string' ? params.value : null,
    updated_at: new Date().toISOString(),
  };
  if (typeof params.folderId === 'string') patch.folder_id = params.folderId;

  const { data, error } = await db
    .from('checklist_records')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', params.id)
    .select('submission_id')
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (data?.submission_id) {
    const { error: submissionError } = await db
      .from('submissions')
      .update({ updated_at: patch.updated_at })
      .eq('user_id', userId)
      .eq('id', data.submission_id);
    if (submissionError) throw new Error(submissionError.message);
  }
  return { ok: true };
}

/** Idempotent — removing a missing record is not an error. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': save,
  'PATCH /': update,
  'DELETE /': remove,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('checklist-records');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const route = ROUTES[`${req.method} ${subPath(url)}`];
  if (!route) return json(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return json(401, { error: 'Not signed in.' });

  try {
    return json(200, await route({ url, req, db: auth.supabase, userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[checklist-records]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
