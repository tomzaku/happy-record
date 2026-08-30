// The `checklist-templates` resource — every read and write of
// `checklist_templates`. See CLAUDE.md.
//
//   GET    /checklist-templates             → { templates }        caller's own, plus any
//     template they've joined a challenge for (see list()'s own comment) — that one always
//     has someone else's `user_id` on it, not the caller's
//   GET    /checklist-templates ?id=        → { templates }        one template,
//     caller's own or anyone's if it's `visibility: 'public'` — this is what backs the
//     `/checklist-template/shared/:id` route (see CLAUDE.md); checkCanReadTemplateById below is
//     what makes a non-owner's lookup return anything at all.
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
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale.
//
// Deploy: `supabase functions deploy checklist-templates`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose } from '../../shared/authorize.ts';
import {
  fromChecklistTemplate,
  patchChecklistTemplate,
  toChecklistTemplate,
} from '../../shared/checklistTemplates.ts';
import { fetchRepeats, pickRepeat, saveRepeat, type RepeatOwner } from '../../shared/repeats.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

const MAX_JOINED_TEMPLATES = 200;

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** The `RepeatOwner` `fetchRepeats` needs to know it's safe to surface a *non-caller* row for
 * this template — its own default schedule, and only when this exact row is `visibility:
 * 'public'` (see `fetchRepeats`'s own comment on why that's narrower than "the caller may read
 * this template at all"). */
function repeatOwnerOf(r: Record<string, unknown>): RepeatOwner {
  return { id: r.id as string, ownerUserId: r.user_id as string, isPublic: r.visibility === 'public' };
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

/** For `GET ?id=` — loads the row (there's nothing to authorize without it) and decides whether
 * this caller may see it: their own, or a `visibility: 'public'` one. `null` for "no," not a
 * thrown error — this used to be RLS silently filtering the row out, and every caller of this
 * route already expects "someone else's private template by id" and "no such id at all" to look
 * identical: an empty `templates` array. */
async function checkCanReadTemplateById({ db, userId, url }: Ctx): Promise<Record<string, unknown> | null> {
  const id = url.searchParams.get('id')!;
  const { data, error } = await db.from('checklist_templates').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return row.user_id === userId || row.visibility === 'public' ? row : null;
}

const getTemplateById = compose(checkCanReadTemplateById, async ({ db, userId }: Ctx, row: Record<string, unknown> | null) => {
  if (!row) return { templates: [] };
  const repeats = await fetchRepeats(db, 'checklistTemplateId', [repeatOwnerOf(row)], userId);
  return { templates: [resolveTemplate(row, repeats, userId)] };
});

/** The unscoped "all mine, plus anything I've joined a challenge for" read — no single
 * `checkPermission` to compose here (unlike `getTemplateById` above): the owned half is a plain
 * explicit filter, and the joined half's own visibility check is a batch filter over rows already
 * scoped to ids this caller is known to have joined, not a single allow/deny decision. */
async function listMine({ db, userId }: Ctx) {
  const [{ data: ownedData, error: ownedError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      db.from('checklist_templates').select('*').eq('user_id', userId).order('created_at'),
      // A joined challenge's template is owned by whoever shared it, not the caller — see
      // useJoinChallenge.tsx's own comment on why joining never forks it into a caller-owned
      // row. Without this, "all mine" only ever returns what the ownership filter above already
      // covers, and a joined challenge silently never appears on the home/tasks page again after
      // the in-memory store resets (a reload, a fresh sign-in) — the one real fetch of it (this
      // route) is ownership-only, and useJoinChallenge.tsx's own merge is transient.
      db.from('challenge_participants').select('checklist_template_id').eq('user_id', userId).limit(MAX_JOINED_TEMPLATES),
    ]);
  if (ownedError) throw new Error(ownedError.message);
  if (participantError) throw new Error(participantError.message);

  const ownedRows = (ownedData ?? []) as Record<string, unknown>[];
  const ownedIds = new Set(ownedRows.map(r => r.id as string));
  const joinedIds = [
    ...new Set(((participantRows ?? []) as Record<string, unknown>[]).map(r => r.checklist_template_id as string)),
  ].filter(id => !ownedIds.has(id));

  const { data: joinedData, error: joinedError } = joinedIds.length
    ? await db.from('checklist_templates').select('*').in('id', joinedIds)
    : { data: [] as Record<string, unknown>[], error: null };
  if (joinedError) throw new Error(joinedError.message);

  // Explicit now, replacing what used to be RLS's own "owner OR public" filter on this query:
  // sharing a template always flips it to `visibility: 'public'` (CardShare's generateShareUrl)
  // before a challenge can even exist for it, so this is normally a no-op — but a template that
  // got unshared *after* this caller joined it must stop appearing here too, the same graceful
  // degrade RLS gave for free before.
  const visibleJoinedRows = ((joinedData ?? []) as Record<string, unknown>[]).filter(r => r.visibility === 'public');

  const rows = [...ownedRows, ...visibleJoinedRows];
  const repeats = await fetchRepeats(db, 'checklistTemplateId', rows.map(repeatOwnerOf), userId);
  // resolveTemplate's viewer/owner resolution actually matters here now: a joined row's
  // `user_id` is the sharer, not the caller, so a personal reminder override
  // (`repeats.user_id === userId`) has to win over the owner's own schedule.
  return { templates: rows.map(r => resolveTemplate(r, repeats, userId)) };
}

async function list(ctx: Ctx) {
  return ctx.url.searchParams.get('id') ? getTemplateById(ctx) : listMine(ctx);
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
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[checklist-templates]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
