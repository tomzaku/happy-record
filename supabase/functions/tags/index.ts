// The `tags` resource — every read and write of `tags`. See CLAUDE.md.
//
//   GET    /tags          → { tags }
//   POST   /tags  { tag } → { ok }
//   DELETE /tags  ?id=      → { ok }
//
// No `api`/`model`/`services` split here (see `notes/` for that shape) and no `compose` — every
// query is already explicitly `.eq('user_id', userId)`, own-row-only with no cross-user
// visibility rule, so there's nothing for a `checkPermission` to decide; just off the RLS-scoped
// client (see `_shared/authorize.ts`) and onto `admin()`.
//
// Deploy: `supabase functions deploy tags`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { admin } from '../_shared/authorize.ts';
import { fromTag, toTag } from '../_shared/tags.ts';
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
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) throw new Error(error.message);
  return { tags: ((data ?? []) as Record<string, unknown>[]).map(toTag) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).tag;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing tag.');

  let row: ReturnType<typeof fromTag>;
  try {
    row = fromTag(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid tag.');
  }

  const { error } = await db.from('tags').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Idempotent — removing a missing tag is not an error. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('tags').delete().eq('user_id', userId).eq('id', id);
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
  const at = parts.lastIndexOf('tags');
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
    console.error('[tags]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
