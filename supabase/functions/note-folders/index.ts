// The `note-folders` resource — every read and write of `note_folders`.
// See CLAUDE.md.
//
//   GET    /note-folders          → { folders }
//   POST   /note-folders  { folder } → { ok }
//   DELETE /note-folders  ?id=       → { ok }
//
// No `api`/`model`/`services` split here (see `notes/` for that shape) and no `compose` — every
// query is already explicitly `.eq('user_id', userId)`, own-row-only with no cross-user
// visibility rule, so there's nothing for a `checkPermission` to decide; just off the RLS-scoped
// client (see `shared/authorize.ts`) and onto `admin()`.
//
// Deploy: `supabase functions deploy note-folders`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin } from '../../shared/authorize.ts';
import { fromNoteFolder, toNoteFolder } from '../../shared/noteFolders.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ db, userId }: Ctx) {
  const { data, error } = await db
    .from('note_folders')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { folders: ((data ?? []) as Record<string, unknown>[]).map(toNoteFolder) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).folder;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing folder.');

  let row: ReturnType<typeof fromNoteFolder>;
  try {
    row = fromNoteFolder(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid folder.');
  }

  const { error } = await db.from('note_folders').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Idempotent — removing a missing folder is not an error. Notes in it just lose their folder (on delete set null). */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('note_folders').delete().eq('user_id', userId).eq('id', id);
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
  const at = parts.lastIndexOf('note-folders');
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
    console.error('[note-folders]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
