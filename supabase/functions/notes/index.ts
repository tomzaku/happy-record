// The `notes` resource — every read and write of `notes`. See CLAUDE.md.
//
// A `type: 'note'` field's own value *inside a checklist* is written via `checklist-records`
// (routing note-type entries into this same table server-side, see checklist-records/index.ts
// and 20260829040000_notes_via_checklist_records.sql) — but it's still a plain row in this same
// table, so reading it doesn't have to go through that resource too; the unscoped GET below reads
// directly, same as everything else here. Every other route stays plain by-id content: the
// standalone notebook (one note per note-type field, via `fields.note_id`) and a field-group's
// own Home note (via `field_groups.note_id`) — whatever owns a note holds its own pointer to it,
// `notes` itself doesn't point back out at anything except `checklist_id`/`checklist_template_id`
// on a journal entry, which is what the unscoped GET groups by.
//
//   GET    /notes ?id=          → { notes }  one note, full content (`value` included) — this is
//                                  the one route that actually opens a note in an editor. Caller's
//                                  own or anyone's if it's a field-group's Home note on a
//                                  `visibility: 'public'` template (see
//                                  20260830010000_public_field_group_notes.sql) — RLS decides,
//                                  same as checklist-templates' own `?id=` branch; this is what
//                                  lets a challenge participant's `useNoteById` resolve the
//                                  sharer's note instead of coming back empty.
//   GET    /notes ?ids=a,b      → { notes }  several at once, full content, same public-note
//                                  exception as `?id=` above — the standalone notebook's own
//                                  listing (one note per note-type field, by their ids), which
//                                  renders each one inline
//   GET    /notes ?q=text&limit= → { notes }  title/search_text match, most recently updated
//                                  first, summaries only (no `value` — see toNoteSummary's own
//                                  comment) — a search UI's own results list, which only ever
//                                  shows a preview. `search_text` is plain text (see
//                                  _shared/notes.ts's own comment), so this is a real substring
//                                  match on what the note actually says, not on `value`'s raw
//                                  JSON.
//   GET    /notes ?limit=       → { notes }  none of the above given — every note this user
//                                  owns, most recently updated first, summaries only: standalone,
//                                  a field-group's own Home note, and every checklist journal
//                                  entry, all in one call (note-manager-page-ui's own Notes page,
//                                  which fetches a selected note's own full content separately
//                                  via `?id=` once someone actually opens it)
//   POST   /notes { note }      → { ok }
//   DELETE /notes ?id=          → { ok }
//
// Deploy: `supabase functions deploy notes`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromNote, toNote, toNoteSummary } from '../_shared/notes.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_ALL_LIMIT = 300;
const MAX_ALL_LIMIT = 1000;

// What a list (summary) read actually needs — no `value`, no `search_text` (server-only, for
// `?q=`'s own filter, never read back). See toNoteSummary's own comment for why this matters:
// leaving `value` off the select means the query never reads a note's — potentially large —
// content off disk for a row that's only ever going to show a title and a short preview.
const SUMMARY_COLUMNS =
  'id, title, preview, owner_type, owner_id, folder_id, checklist_id, checklist_template_id, submission_id, created_at, updated_at';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

function limitFrom(url: URL, fallback: number, max: number): number {
  const raw = Number(url.searchParams.get('limit'));
  return Number.isFinite(raw) && raw >= 1 ? Math.min(Math.floor(raw), max) : fallback;
}

async function list({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const q = url.searchParams.get('q');

  if (id || ids.length) {
    // No hard `user_id` filter here, unlike every other branch below — RLS alone decides what
    // comes back (the caller's own rows, or a field-group's Home note whose template is public;
    // see 20260830010000_public_field_group_notes.sql), the same "rely on RLS for a by-id
    // lookup" shape checklist-templates' own `?id=` branch uses. This is what makes a challenge
    // participant's `useNoteById(fieldGroup.noteId)` actually resolve to the sharer's note
    // instead of coming back empty.
    let query = db.from('notes').select('*');
    query = id ? query.eq('id', id) : query.in('id', ids);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { notes: ((data ?? []) as Record<string, unknown>[]).map(toNote) };
  }

  let query = db.from('notes').select(SUMMARY_COLUMNS).eq('user_id', userId);
  if (q) {
    // A real substring, not user-controlled SQL: PostgREST's `.or()` filter string still needs
    // `%`/commas/parens escaped out of it, since those are syntax there, not just in the ILIKE
    // pattern itself.
    const escaped = q.replace(/[%,()]/g, char => `\\${char}`);
    const pattern = `%${escaped}%`;
    query = query
      .or(`title.ilike.${pattern},search_text.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(limitFrom(url, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT));
  } else {
    // Nothing scoping this to a specific id/set/search — every note this user owns.
    query = query
      .order('updated_at', { ascending: false })
      .limit(limitFrom(url, DEFAULT_ALL_LIMIT, MAX_ALL_LIMIT));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { notes: ((data ?? []) as Record<string, unknown>[]).map(toNoteSummary) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).note;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing note.');

  let row: ReturnType<typeof fromNote>;
  try {
    row = fromNote(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid note.');
  }

  const { error } = await db.from('notes').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);

  // A journal entry (checklist_id set) has a paired `checklist_records` row — same id, per
  // checklist-records/index.ts's own fromChecklistFieldNoteEntry — whose own `updated_at` needs
  // bumping too, or that row's own last-write-wins merge on the checklist side won't realize
  // this edit (landing here, not through checklist-records' own PATCH) is newer than what it
  // already has cached. Mirrors checklist-records/index.ts's own update(), which already does
  // the same thing in the other direction.
  if (row.checklist_id) {
    const { error: bumpError } = await db
      .from('checklist_records')
      .update({ updated_at: row.updated_at })
      .eq('user_id', userId)
      .eq('id', row.id);
    if (bumpError) throw new Error(bumpError.message);
  }

  return { ok: true };
}

/** Idempotent — removing a missing note is not an error. A journal entry's paired
 * `checklist_records` row (same id, see save()'s own comment) has to go first, explicitly —
 * `checklist_records.note_id` is `on delete set null`, but that FK action alone would leave a
 * row with `note_id`, `value_number`, and `value_text` all null at once, which fails
 * `checklist_records_value_shape`'s own CHECK and would abort this delete entirely. Deleting the
 * pointer row directly (harmless no-op for a standalone/field-group note, which never has one)
 * sidesteps that path the same way checklist-records/index.ts's own remove() already does. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error: recordError } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (recordError) throw new Error(recordError.message);
  const { error } = await db.from('notes').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': save,
  'DELETE /': remove,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('notes');
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
    console.error('[notes]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
