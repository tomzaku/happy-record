// The `notes` resource — every read and write of `notes`. See CLAUDE.md. Plain by-id content now
// (see 20260829010000_notes_note_id_ownership.sql): whatever a note belongs to (a field, a field
// group) holds its own `note_id` pointing here, `notes` itself doesn't point back out at anything.
//
//   GET    /notes ?id=                                        → { notes }  one note
//   GET    /notes ?ids=a,b                                    → { notes }  several at once (the
//                                                                standalone notebook's own
//                                                                listing — one note per
//                                                                note-type field, by their ids)
//   GET    /notes ?ownerIds=a,b&checklistId=                  → { notes }  one day's journal
//                                                                entries for those fields inside
//                                                                a checklist (0 or more per field
//                                                                — every Submit adds a new one)
//   GET    /notes ?ownerIds=a,b&checklistTemplateId=&from=&to= → { notes }  a whole range of
//                                                                days' journal entries — History
//   GET    /notes ?q=text&limit=                              → { notes }  title/search_text
//                                                                match, most recently updated
//                                                                first — a search UI's own
//                                                                results list. `search_text` is
//                                                                plain text (see _shared/notes.ts's
//                                                                own comment), so this is a real
//                                                                substring match on what the note
//                                                                actually says, not on `value`'s
//                                                                raw JSON.
//   POST   /notes { note }                                    → { ok }
//   DELETE /notes ?id=                                        → { ok }
//
// Deploy: `supabase functions deploy notes`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromNote, toNote } from '../_shared/notes.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  const ownerIds = (url.searchParams.get('ownerIds') ?? '').split(',').filter(Boolean);
  const checklistId = url.searchParams.get('checklistId');
  const checklistTemplateId = url.searchParams.get('checklistTemplateId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const q = url.searchParams.get('q');
  if (!id && !ids.length && !ownerIds.length && !q) return { notes: [] };

  let query = db.from('notes').select('*').eq('user_id', userId);
  if (id) {
    query = query.eq('id', id);
  } else if (ids.length) {
    query = query.in('id', ids);
  } else if (ownerIds.length) {
    // A checklist's own journal entries for these fields — one day (`checklistId`) or a whole
    // range (`checklistTemplateId` + `from`/`to`), never the field's own single current note
    // (that's `?ids=`/`?id=` against `fields.note_id` instead, resolved client-side).
    query = query.in('owner_id', ownerIds).eq('owner_type', 'field');
    if (checklistId) query = query.eq('checklist_id', checklistId);
    if (checklistTemplateId) query = query.eq('checklist_template_id', checklistTemplateId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    query = query.order('created_at', { ascending: false });
  } else {
    // `q` — a real substring, not user-controlled SQL: PostgREST's `.or()` filter string still
    // needs `%`/commas/parens escaped out of it, since those are syntax there, not just in the
    // ILIKE pattern itself.
    const escaped = (q as string).replace(/[%,()]/g, char => `\\${char}`);
    const pattern = `%${escaped}%`;
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam >= 1
      ? Math.min(Math.floor(limitParam), MAX_SEARCH_LIMIT)
      : DEFAULT_SEARCH_LIMIT;
    query = query
      .or(`title.ilike.${pattern},search_text.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { notes: ((data ?? []) as Record<string, unknown>[]).map(toNote) };
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
  return { ok: true };
}

/** Idempotent — removing a missing note is not an error. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
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
