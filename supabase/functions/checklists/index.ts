// The `checklists` resource — every read and write of `checklists` (one
// day's instance of a template). See CLAUDE.md.
//
//   GET    /checklists  ?id=                             → { checklists }  one, by id
//   GET    /checklists  ?checklistTemplateId=&from=&to=   → { checklists }
//   POST   /checklists  { checklist }                     → { ok }
//   DELETE /checklists  ?id=                               → { ok }
//
// `save` always takes the *whole* checklist (see `_shared/checklists.ts`): a
// caller doing a partial update (e.g. just setting `completedAt`) merges
// with its local copy first, same as `tasks`' `updateTask`.
//
// Deploy: `supabase functions deploy checklists`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromChecklist, toChecklist } from '../_shared/checklists.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const MAX_LIMIT = 2000;

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/**
 * This user's checklists — one by `id` (the shape `detail-task-page` needs:
 * it already knows the exact checklist id from the URL, no reason to fetch
 * a whole range and filter client-side), or optionally scoped to one
 * template and/or a `started_at` range.
 */
async function list({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (id) {
    const { data, error } = await db
      .from('checklists')
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .limit(1);
    if (error) throw new Error(error.message);
    return { checklists: ((data ?? []) as Record<string, unknown>[]).map(toChecklist) };
  }

  const templateId = url.searchParams.get('checklistTemplateId');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let q = db.from('checklists').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(MAX_LIMIT);
  if (templateId) q = q.eq('checklist_template_id', templateId);
  if (from) q = q.gte('started_at', from);
  if (to) q = q.lte('started_at', to);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { checklists: ((data ?? []) as Record<string, unknown>[]).map(toChecklist) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).checklist;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing checklist.');

  let row: ReturnType<typeof fromChecklist>;
  try {
    row = fromChecklist(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid checklist.');
  }

  const { error } = await db.from('checklists').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}

/** Idempotent — removing a missing checklist is not an error. */
async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklists').delete().eq('user_id', userId).eq('id', id);
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
  const at = parts.lastIndexOf('checklists');
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
    console.error('[checklists]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
