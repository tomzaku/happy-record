// The `fields` resource — every read and write of the `fields` table. See
// CLAUDE.md.
//
//   GET    /fields                 → { fields }
//   GET    /fields  ?ids=a,b        → { fields }  just those ids, same visibility rule
//   GET    /fields  ?templateId=    → { fields }  every field one already-public checklist
//                                      template's own field_groups reference — see listByTemplate
//                                      below
//   POST   /fields  { field }       → { ok }
//   DELETE /fields  ?id=            → { ok }
//
// GET (unscoped or `?ids=`) returns the caller's own fields *and* anyone's public ones — but
// `visibility: 'public'` is never something a write through this resource can grant anymore (see
// shared/fields.ts's own comment): the only public rows that exist are the three seeded
// defaults (20260821000000_seed_system_fields.sql), written by a migration under the service
// role. A shared checklist template's own (private) fields are resolved a different way —
// `?templateId=` below — authorized by the template being public, not by flipping the field
// itself public for literally everyone on the platform to see in their own field pickers.
//
// Writes stay owner-only — `save`/`remove` hardcode `user_id`, nothing to compose a
// `checkPermission` around.
//
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale. `?templateId=` already
// reached for a service-role client before any of that existed (see checkCanReadFieldsByTemplate
// below) — it's folded into the same `admin()` everything else now uses instead of its own
// one-off `createClient` call.
//
// Deploy: `supabase functions deploy fields`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose } from '../../shared/authorize.ts';
import { fromRecordField, toRecordField } from '../../shared/fields.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** A field id out of a `field_groups.fields` jsonb array element — either the current
 * `{ fieldId, overrides? }` shape or a legacy plain id string (a row saved before that shape
 * existed — see useChecklistTemplates.tsx's own normalizeFieldGroupFields, the client-side
 * equivalent of this same tolerance). */
function fieldIdOf(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && typeof (entry as { fieldId?: unknown }).fieldId === 'string') {
    return (entry as { fieldId: string }).fieldId;
  }
  return undefined;
}

/** Every field id one checklist template's own field_groups reference, or `null` if this caller
 * may not see that template at all (nonexistent, or private and not public — the same "empty,
 * never an error" contract `checklist-templates`' own `?id=` branch and `field-groups`' own
 * scoped read both use). Own-templates-only was never the rule here — reachable at all only if
 * the template is genuinely `visibility: 'public'`, same as before this moved off RLS. */
async function checkCanReadFieldsByTemplate({ db, url }: Ctx): Promise<string[] | null> {
  const templateId = url.searchParams.get('templateId')!;
  const { data: template, error: templateError } = await db
    .from('checklist_templates')
    .select('id')
    .eq('id', templateId)
    .eq('visibility', 'public')
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template) return null;

  const { data: groups, error: groupsError } = await db
    .from('field_groups')
    .select('fields')
    .eq('checklist_template_id', templateId);
  if (groupsError) throw new Error(groupsError.message);

  return [
    ...new Set(
      ((groups ?? []) as { fields: unknown }[]).flatMap(g =>
        (Array.isArray(g.fields) ? g.fields : []).map(fieldIdOf).filter((id): id is string => !!id),
      ),
    ),
  ];
}

/**
 * Every field one checklist template's own field_groups reference — the shared-template page's
 * own read, replacing the old "sharing flips every referenced field to `visibility: 'public'`"
 * design (see useCreateChecklistTemplateApi.tsx's own comment for why that changed: a field
 * becoming public makes it usable in *anyone's* checklist, not just visible to whoever the share
 * link went to). The fields themselves stay `visibility: 'private'` in the table — reading them
 * by this pre-validated, narrow id set (rather than the caller's own owner-or-public visibility
 * rule below) is a deliberate, narrowly-scoped bypass of that, not a blanket "read any field"
 * grant; this was the only place in this app that reached for the service role before every
 * resource started moving onto it (see `shared/authorize.ts`).
 */
const listByTemplate = compose(checkCanReadFieldsByTemplate, async ({ db }: Ctx, fieldIds: string[] | null) => {
  if (!fieldIds || !fieldIds.length) return { fields: [] };
  const { data, error } = await db.from('fields').select('*').in('id', fieldIds);
  if (error) throw new Error(error.message);
  return { fields: ((data ?? []) as Record<string, unknown>[]).map(toRecordField) };
});

/** Own fields plus anyone's public ones — already an explicit rule, not an implicit RLS filter,
 * so it needs no `checkPermission` of its own. */
async function listMine({ url, db, userId }: Ctx) {
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

async function list(ctx: Ctx) {
  return ctx.url.searchParams.get('templateId') ? listByTemplate(ctx) : listMine(ctx);
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
    return json(200, await route({ url, req, db: admin(), userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[fields]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
