// The `checklist-templates` resource — every read and write of
// `checklist_templates`. See CLAUDE.md.
//
//   GET    /checklist-templates             → { templates }        caller's own
//   GET    /checklist-templates ?id=        → { templates }        one template,
//     caller's own or anyone's if it's `visibility: 'public'` — this is what
//     backs the `/checklist-template/shared/:id` route (see CLAUDE.md): the
//     public-read RLS policy below is what makes a non-owner's lookup return
//     anything at all.
//   POST   /checklist-templates { template } → { ok }
//   PATCH  /checklist-templates { id, ...changes } → { ok }
//   DELETE /checklist-templates  ?id=        → { ok }
//
// field_groups isn't part of this resource anymore — see `field-groups`
// (20260829010000_notes_note_id_ownership.sql). `repeat` isn't a column on this row anymore
// either (see `repeats` — 20260830000000_repeats_table.sql), but it stays part of `template` on
// the wire: every route below fetches/writes the matching `repeats` row alongside its own.
//
// PATCH is also how a challenge participant sets their own reminder time, distinct from the
// owner's — see update()'s own comment. Everything else here (title, avatar, tags, visibility,
// flagId) stays owner-only, enforced by the `.eq('user_id', userId)` on the actual row update.
//
// Deploy: `supabase functions deploy checklist-templates`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import {
  fromChecklistTemplate,
  patchChecklistTemplate,
  toChecklistTemplate,
} from '../_shared/checklistTemplates.ts';
import { fetchRepeats, pickRepeat, saveRepeat } from '../_shared/repeats.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** Resolves one row's effective schedule for `userId` and maps it to the wire shape — shared by
 * both branches of list() below so "which row wins, and is it a personal override" is decided in
 * exactly one place. */
function resolveTemplate(r: Record<string, unknown>, repeatsByTemplate: Record<string, Record<string, unknown>[]>, userId: string) {
  const ownerId = r.user_id as string;
  const repeatRow = pickRepeat(repeatsByTemplate[r.id as string], userId, ownerId);
  const isPersonalOverride = !!repeatRow && repeatRow.user_id === userId && userId !== ownerId;
  return toChecklistTemplate(r, repeatRow, isPersonalOverride);
}

async function list({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');

  // A shared-template lookup: no `user_id` filter, so this relies entirely
  // on RLS ("owner OR visibility = 'public'") to decide what comes back —
  // someone else's private template by id returns empty, not an error.
  if (id) {
    const { data, error } = await db
      .from('checklist_templates')
      .select('*')
      .eq('id', id)
      .limit(1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Record<string, unknown>[];
    const repeats = await fetchRepeats(db, 'checklistTemplateId', rows.map(r => r.id as string));
    return { templates: rows.map(r => resolveTemplate(r, repeats, userId)) };
  }

  const { data, error } = await db
    .from('checklist_templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const repeats = await fetchRepeats(db, 'checklistTemplateId', rows.map(r => r.id as string));
  // Always the caller's own templates here (the query above is hard-filtered to `user_id`), so
  // resolveTemplate's own viewer/owner resolution is a no-op today (userId === ownerId for every
  // row) — kept anyway so this stays correct the day this branch ever needs to include a joined
  // challenge alongside the caller's own templates.
  return { templates: rows.map(r => resolveTemplate(r, repeats, userId)) };
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).template;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing template.');

  let row: ReturnType<typeof fromChecklistTemplate>;
  try {
    row = fromChecklistTemplate(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  const { error } = await db.from('checklist_templates').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  // After the template row exists — repeats.checklist_template_id is a real FK, so the parent has
  // to be there first.
  await saveRepeat(db, (entry as Record<string, unknown>).repeat, { userId, checklistTemplateId: row.id });
  return { ok: true };
}

/**
 * Edits only the fields the caller actually changed — a schedule/tag/flag edit sends a diff, not
 * the whole template, so an in-flight edit to a field nobody touched here can't get clobbered by
 * a stale client copy the way `save`'s full-row upsert would.
 *
 * `repeat` is deliberately not gated by the same `.eq('user_id', userId)` ownership check as the
 * rest of `patch` — `saveRepeat` always writes to the *caller's own* row (see its own comment),
 * so a challenge participant PATCHing `{ id: <the owner's template id>, repeat: {...} }` sets
 * their own personal reminder time without touching the owner's schedule or needing to own the
 * template at all; sending anything else in the same call (title, tags, ...) still silently no-ops
 * for them, same as before, since that part of the update only ever matches the owner's own row.
 */
async function update({ req, db, userId }: Ctx) {
  const params = await body(req);
  if (typeof params.id !== 'string' || !params.id) throw new ApiError(400, 'Missing id.');

  let patch: Record<string, unknown>;
  try {
    patch = patchChecklistTemplate(params);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid template.');
  }

  const { error } = await db
    .from('checklist_templates')
    .update(patch)
    .eq('user_id', userId)
    .eq('id', params.id);
  if (error) throw new Error(error.message);
  if ('repeat' in params) {
    await saveRepeat(db, params.repeat, { userId, checklistTemplateId: params.id });
  }
  return { ok: true };
}

async function remove({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklist_templates').delete().eq('user_id', userId).eq('id', id);
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
  const at = parts.lastIndexOf('checklist-templates');
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
    console.error('[checklist-templates]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
