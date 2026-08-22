// The `fields` resource — every read and write of the `fields` table. See
// CLAUDE.md.
//
//   GET    /fields           → { fields }
//   GET    /fields  ?ids=a,b  → { fields }  just those ids, same visibility rule
//   POST   /fields  { field } → { ok }
//   DELETE /fields  ?id=      → { ok }
//
// GET returns the caller's own fields *and* anyone's public ones — a field
// with `visibility: 'public'` is meant to be usable in someone else's
// checklist template, not just visible in a list. `?ids=` narrows that to a
// specific set without waiting on a full sync — the shared-template page
// uses it to resolve exactly the fields one template's field_groups
// reference. Writes stay owner-only; RLS's own-row policy already blocks
// anyone but the owner from touching a public field, this just keeps the
// same shape true in the query too.
//
// Deploy: `supabase functions deploy fields`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromRecordField, toRecordField } from '../_shared/fields.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

async function list({ url, db, userId }: Ctx) {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);

  let query = db
    .from('fields')
    .select('*')
    .or(`user_id.eq.${userId},visibility.eq.public`);
  if (ids.length) query = query.in('id', ids);

  const { data, error } = await query.order('created_at');
  if (error) throw new Error(error.message);
  return { fields: ((data ?? []) as Record<string, unknown>[]).map(toRecordField) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).field;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing field.');

  let row: ReturnType<typeof fromRecordField>;
  try {
    row = fromRecordField(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid field.');
  }

  const { error } = await db.from('fields').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}

async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('fields').delete().eq('user_id', userId).eq('id', id);
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
  const at = parts.lastIndexOf('fields');
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
    console.error('[fields]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
