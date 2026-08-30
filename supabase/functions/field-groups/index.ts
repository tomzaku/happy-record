// The `field-groups` resource — every read and write of `field_groups`. See CLAUDE.md and
// 20260829010000_notes_note_id_ownership.sql for why this moved off
// `checklist_templates.field_groups` jsonb into its own table.
//
//   GET    /field-groups ?checklistTemplateId=   → { fieldGroups }  one template's own groups —
//     the caller's own, or anyone's if that exact template is `visibility: 'public'` (see
//     20260829060000_public_template_field_groups.sql; the shared-template page is what actually
//     relies on this)
//   GET    /field-groups                          → { fieldGroups }  every group across all of
//     the caller's templates — the home page's own schedule-matching needs every template's
//     groups loaded at once (see useChecklistTemplates.tsx's getChecklistTemplateIdsByGivingDate),
//     same "all mine, unscoped" shape flags/note-folders/tags already use. Always the caller's
//     own only, unlike the scoped form above — see list()'s own comment on why.
//   POST   /field-groups { fieldGroup }           → { ok }   full-row upsert — create, edit,
//     set/clear noteId, or set archivedAt (soft delete; there's no hard-delete route, matching
//     the convention this replaced).
//
// Moved off RLS onto the app-layer `compose(checkPermission, core)` pattern — see
// `shared/authorize.ts` and `notes/index.ts` for the full rationale.
//
// Deploy: `supabase functions deploy field-groups`

import { ApiError, corsHeaders, json } from '../../shared/cors.ts';
import { requireUser } from '../../shared/auth.ts';
import { admin, compose } from '../../shared/authorize.ts';
import { fromFieldGroup, toFieldGroup } from '../../shared/fieldGroups.ts';
import { fetchRepeats, pickRepeat, saveRepeat } from '../../shared/repeats.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Ctx = { url: URL; req: Request; db: SupabaseClient; userId: string };

async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return ((await req.json()) ?? {}) as Record<string, unknown>;
  } catch {
    throw new ApiError(400, 'Invalid JSON body.');
  }
}

/** Attaches each row's own schedule the same way regardless of which branch of `list` produced
 * the rows — shared so that logic lives in exactly one place. */
async function withRepeats(db: SupabaseClient, userId: string, rows: Record<string, unknown>[]) {
  const repeats = await fetchRepeats(db, 'fieldGroupId', rows.map(r => r.id as string));
  // No participant-override concept for a group's own schedule today — only its owner ever
  // writes one (see save() below) — but resolving through pickRepeat rather than assuming "the
  // only row" keeps this consistent with checklist-templates' own resolution, and correct without
  // changes if that ever stops being true.
  return rows.map(r => toFieldGroup(r, pickRepeat(repeats[r.id as string], userId, r.user_id as string)));
}

type TemplateGroupsAuthorization = { checklistTemplateId: string; visible: boolean };

/** Whether the caller may see *this* template's field groups at all — own template, or a
 * `visibility: 'public'` one. A `false` result isn't a 403: the old RLS policy just silently
 * filtered every row out for a template that doesn't exist or isn't visible, the same "empty,
 * never an error" contract `checklist-templates`' own `?id=` branch documents — so the core below
 * returns `{ fieldGroups: [] }` rather than the composed handler throwing. */
async function checkCanReadFieldGroupsByTemplate({ db, userId, url }: Ctx): Promise<TemplateGroupsAuthorization> {
  const checklistTemplateId = url.searchParams.get('checklistTemplateId')!;
  const { data: template, error } = await db
    .from('checklist_templates')
    .select('user_id, visibility')
    .eq('id', checklistTemplateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const visible = !!template && (template.user_id === userId || template.visibility === 'public');
  return { checklistTemplateId, visible };
}

const getGroupsByTemplate = compose(
  checkCanReadFieldGroupsByTemplate,
  async ({ db, userId }: Ctx, { checklistTemplateId, visible }: TemplateGroupsAuthorization) => {
    if (!visible) return { fieldGroups: [] };
    const { data, error } = await db
      .from('field_groups')
      .select('*')
      .eq('checklist_template_id', checklistTemplateId)
      .order('position');
    if (error) throw new Error(error.message);
    return { fieldGroups: await withRepeats(db, userId, (data ?? []) as Record<string, unknown>[]) };
  },
);

/** Unscoped ("all mine", the home page's own schedule-matching) — always the caller's own only,
 * a plain explicit filter with nothing to compose a `checkPermission` around. */
async function listMine({ db, userId }: Ctx) {
  const { data, error } = await db.from('field_groups').select('*').eq('user_id', userId).order('position');
  if (error) throw new Error(error.message);
  return { fieldGroups: await withRepeats(db, userId, (data ?? []) as Record<string, unknown>[]) };
}

async function list(ctx: Ctx) {
  return ctx.url.searchParams.get('checklistTemplateId') ? getGroupsByTemplate(ctx) : listMine(ctx);
}

async function save({ req, db, userId }: Ctx) {
  const entry = (await body(req)).fieldGroup;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing fieldGroup.');

  let row: ReturnType<typeof fromFieldGroup>;
  try {
    row = fromFieldGroup(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid fieldGroup.');
  }

  const { error } = await db.from('field_groups').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  // After the group row exists — repeats.field_group_id is a real FK, so the parent has to be
  // there first.
  await saveRepeat(db, (entry as Record<string, unknown>).repeat, { userId, fieldGroupId: row.id });
  return { ok: true };
}

const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': list,
  'POST /': save,
};

function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('field-groups');
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
    console.error('[field-groups]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
