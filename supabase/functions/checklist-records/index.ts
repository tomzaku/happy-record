// The `checklist-records` resource — every read and write of a checklist's own fields, number,
// text, date, datetime, or note. See CLAUDE.md.
//
//   GET    /checklist-records  ?checklistTemplateId=&from=&to=&fieldIds=&limit=  → { records }
//   POST   /checklist-records  { records, checklistId, checklistTemplateId, createdAt, submissionId } → { ok }
//   PATCH  /checklist-records  { id, value, title?, folderId? }                  → { ok }
//   DELETE /checklist-records  ?id=                                             → { ok }
//
// `checklistTemplateId` is optional on GET — omitted, it reads across every
// template the caller owns.
//
// A `type: 'note'` field's own entry gets a real `checklist_records` row same as every other
// field type's — see 20260829050000_checklist_records_note_id.sql — but with no value of its own
// (`value_number`/`value_text` both null): its real content lives in `notes`, pointed at by
// `note_id`. Both rows share one id (see `fromChecklistFieldNoteEntry`), so `note_id` is always
// that same id, never a separately generated one. This keeps every read here a single
// range-filtered query against `checklist_records` — `list()` below resolves the handful of
// referenced notes afterward, by id, rather than running a second range query against `notes` and
// merging results client-side.
//
// This function also owns the `submissions` table's whole lifecycle — POST
// creates the row every record in the batch points at, PATCH bumps its
// `updated_at`. No separate `submissions` resource exists; nothing reads one
// on its own today.
//
// No `api`/`model`/`services` split here (see `notes/` for that shape) and no `compose` — every
// query is already explicitly `.eq('user_id', userId)`, own-row-only with no cross-user
// visibility rule (a challenge dashboard's own peer-read of *other* participants'
// checklist_records happens in `challenges/index.ts`, on its own explicit query — see that
// function), so there's nothing for a `checkPermission` to decide here; just off the RLS-scoped
// client (see `_shared/authorize.ts`) and onto `admin()`.
//
// Deploy: `supabase functions deploy checklist-records`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { admin } from '../_shared/authorize.ts';
import {
  fromChecklistFieldNoteEntry,
  fromRecordEntry,
  limitOf,
  MAX_BULK,
  toChecklistRecord,
} from '../_shared/checklistRecords.ts';
import { computeSearchText } from '../_shared/notes.ts';
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

/** The real `{ value, title }` for every `note_id` referenced among a page of
 * `checklist_records` rows, keyed by that id — a single by-id lookup, not a second
 * range-filtered query (see module doc comment). */
async function resolveNotes(
  db: SupabaseClient,
  userId: string,
  noteIds: string[],
): Promise<Map<string, { value: unknown; title: string }>> {
  const map = new Map<string, { value: unknown; title: string }>();
  if (!noteIds.length) return map;
  const { data, error } = await db
    .from('notes')
    .select('id, value, title')
    .eq('user_id', userId)
    .in('id', noteIds);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { id: string; value: string; title: string | null }[]) {
    let value: unknown = row.value;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // Tolerant of a legacy plain-text value, same as noteApi.ts's own parseValue — kept
        // as-is rather than discarded.
      }
    }
    map.set(row.id, { value, title: row.title ?? '' });
  }
  return map;
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
  const rows = (data ?? []) as Record<string, unknown>[];

  const noteIds = rows
    .map(r => r.note_id)
    .filter((id): id is string => typeof id === 'string');
  const notesById = await resolveNotes(db, userId, noteIds);

  const records = rows.map(r =>
    toChecklistRecord(r, typeof r.note_id === 'string' ? notesById.get(r.note_id) : undefined),
  );
  return { records };
}

/** Every field type but `note` has a plain `number | string` value (number, text, date,
 * datetime — see _shared/fields.ts's own FIELD_TYPES comment); a note-type field's own entry is
 * real Editor.js `OutputData` (an object) instead — same shape-based split `update()` below
 * already uses, not a `fields` table lookup. Deliberately not looking the field up: a lookup can
 * only ever be as reliable as `fields` having a row for this id, and the value's own shape
 * already says which table it belongs in unambiguously — trusting the lookup instead used to
 * fail silently closed (an id the query didn't resolve — a race, a table not yet seeded — fell
 * through to "not a note" and threw `fromRecordEntry`'s own "Missing value." on real note
 * content). */
function isNoteEntry(e: Record<string, unknown>): boolean {
  return typeof e.value !== 'number' && typeof e.value !== 'string';
}

/**
 * Bulk-writes one submit's worth of fields — `RecordDayEdit`'s Submit button
 * sends every field on the day's form in one call, matching
 * `addChecklistRecord`'s batch shape. Creates the owning `submissions` row
 * first — `checklist_records.submission_id` is a real foreign key, so the parent has to exist
 * before any record (number/text/date/datetime, or note) can reference it.
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

  const shared = { checklistId, checklistTemplateId, createdAt, submissionId };
  // Not "metricEntries" — this covers every non-note type (number, text, date, datetime), all of
  // which share the same plain-value `checklist_records` row shape.
  const valueEntries = entries.filter(e => !isNoteEntry(e as Record<string, unknown>));
  const noteEntries = entries.filter(e => isNoteEntry(e as Record<string, unknown>));

  const { error: submissionError } = await db.from('submissions').upsert({
    id: submissionId,
    user_id: userId,
    checklist_id: checklistId,
    checklist_template_id: checklistTemplateId,
    created_at: createdAt,
  });
  if (submissionError) throw new Error(submissionError.message);

  const recordRows: (ReturnType<typeof fromRecordEntry> | ReturnType<typeof fromChecklistFieldNoteEntry>['recordRow'])[] = [];

  if (valueEntries.length) {
    try {
      recordRows.push(...valueEntries.map(e => fromRecordEntry(e as Record<string, unknown>, shared)));
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Invalid record.');
    }
  }

  if (noteEntries.length) {
    let built: ReturnType<typeof fromChecklistFieldNoteEntry>[];
    try {
      built = noteEntries.map(e => fromChecklistFieldNoteEntry(e as Record<string, unknown>, shared));
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Invalid record.');
    }
    // The `notes` rows first — `checklist_records.note_id` is a real FK, so the row it points at
    // has to exist before the pointer row referencing it is written.
    const { error: noteError } = await db
      .from('notes')
      .upsert(built.map(b => ({ user_id: userId, ...b.noteRow })));
    if (noteError) throw new Error(noteError.message);
    recordRows.push(...built.map(b => b.recordRow));
  }

  if (recordRows.length) {
    const { error } = await db
      .from('checklist_records')
      .upsert(recordRows.map(row => ({ user_id: userId, ...row })));
    if (error) throw new Error(error.message);
  }

  return { ok: true };
}

/** Shared by both branches of update() below — a submission has no fields of its own to edit, so
 * this is the only thing that ever changes it after it's created. */
async function bumpSubmission(
  db: SupabaseClient,
  userId: string,
  submissionId: string | null | undefined,
  updatedAt: string,
) {
  if (!submissionId) return;
  const { error } = await db
    .from('submissions')
    .update({ updated_at: updatedAt })
    .eq('user_id', userId)
    .eq('id', submissionId);
  if (error) throw new Error(error.message);
}

/**
 * Edits one record's value (and, for a note-type field's own entry, its title) in place — the
 * inline editor on both Submit and History. A number/text/date/datetime field's own `value` is
 * always `number | string`, decided the same way `save()`'s own `isNoteEntry` is; a note-type field's is real
 * Editor.js `OutputData` (an object) or entirely absent (a title-only edit), which reaches for
 * `notes` instead — same id as this record (see module doc comment), so `params.id` addresses
 * both rows without the client ever needing to know there are two. That row's own
 * `checklist_records.updated_at` gets bumped alongside the content edit — `toChecklistRecord`
 * reads `updated_at` off the `checklist_records` row even for a note-type record, and the
 * client's own last-write-wins merge (useChecklistRecord.ts's getChecklistRecords) trusts that
 * timestamp to know a fetched row is actually newer than what it already has; leaving it stale
 * here would make a real content edit look like a no-op on the next fetch.
 */
async function update({ req, db, userId }: Ctx) {
  const params = await body(req);
  if (typeof params.id !== 'string' || !params.id) throw new ApiError(400, 'Missing id.');

  const now = new Date().toISOString();

  if (typeof params.value === 'number' || typeof params.value === 'string') {
    const patch: Record<string, unknown> = {
      value_number: typeof params.value === 'number' ? params.value : null,
      value_text: typeof params.value === 'string' ? params.value : null,
      updated_at: now,
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
    if (data) {
      await bumpSubmission(db, userId, data.submission_id as string | null, now);
      return { ok: true };
    }
  }

  if (!('value' in params) && typeof params.title !== 'string') throw new ApiError(400, 'Missing value.');
  const notePatch: Record<string, unknown> = { updated_at: now };
  if ('value' in params) {
    // Computed here, not trusted from the client — same as fromNote's own search_text.
    notePatch.search_text = computeSearchText(params.value);
    notePatch.value = JSON.stringify(params.value ?? null);
  }
  if (typeof params.title === 'string') notePatch.title = params.title;

  const { data, error } = await db
    .from('notes')
    .update(notePatch)
    .eq('user_id', userId)
    .eq('id', params.id)
    .select('submission_id')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError(404, 'Not found.');

  const { error: bumpError } = await db
    .from('checklist_records')
    .update({ updated_at: now })
    .eq('user_id', userId)
    .eq('id', params.id);
  if (bumpError) throw new Error(bumpError.message);

  await bumpSubmission(db, userId, data.submission_id as string | null, now);
  return { ok: true };
}

/** Idempotent — removing a missing record is not an error. Deletes the `checklist_records` row
 * first (harmless no-op if this id was never one), then `notes` (harmless no-op for a plain
 * number/text/date/datetime record's own id) — `checklist_records.note_id` is `on delete set
 * null`, so order doesn't matter for the FK, but deleting the pointer before the content it
 * points at reads more naturally than the reverse. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: noteError } = await db.from('notes').delete().eq('user_id', userId).eq('id', id);
  if (noteError) throw new Error(noteError.message);
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
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[checklist-records]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
