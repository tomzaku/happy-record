// The `notes` resource — every read and write of `notes`. See CLAUDE.md.
// Not `checklist_records`: a note never belongs to a checklist (see the
// migration for why they got split apart).
//
//   GET    /notes  ?fieldIds=&folderId=&limit=  → { notes }
//   POST   /notes  { note }                     → { ok }
//   DELETE /notes  ?id=                          → { ok }
//
// Deploy: `supabase functions deploy notes`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromNote, limitOf, toNote } from '../_shared/notes.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const DEFAULT_PAGE = 500;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ url, db, userId }: Ctx) {
  const fieldIds = (url.searchParams.get('fieldIds') ?? '').split(',').filter(Boolean);
  const folderId = url.searchParams.get('folderId');
  const limit = limitOf(url.searchParams.get('limit'), DEFAULT_PAGE);

  let q = db
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (fieldIds.length) q = q.in('field_id', fieldIds);
  if (folderId) q = q.eq('folder_id', folderId);

  const { data, error } = await q;
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
