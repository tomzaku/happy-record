// The `field-groups` resource — every read and write of `field_groups`. See CLAUDE.md and
// 20260829010000_notes_note_id_ownership.sql for why this moved off
// `checklist_templates.field_groups` jsonb into its own table.
//
//   GET    /field-groups ?checklistTemplateId=   → { fieldGroups }  one template's own groups
//   GET    /field-groups                          → { fieldGroups }  every group across all of
//     the caller's templates — the home page's own schedule-matching needs every template's
//     groups loaded at once (see useChecklistTemplates.tsx's getChecklistTemplateIdsByGivingDate),
//     same "all mine, unscoped" shape flags/note-folders/tags already use.
//   POST   /field-groups { fieldGroup }           → { ok }   full-row upsert — create, edit,
//     set/clear noteId, or set archivedAt (soft delete; there's no hard-delete route, matching
//     the convention this replaced).
//
// Deploy: `supabase functions deploy field-groups`

import { ApiError, corsHeaders, json } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import { fromFieldGroup, toFieldGroup } from '../_shared/fieldGroups.ts';
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
  const checklistTemplateId = url.searchParams.get('checklistTemplateId');

  let q = db.from('field_groups').select('*').eq('user_id', userId).order('position');
  if (checklistTemplateId) q = q.eq('checklist_template_id', checklistTemplateId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { fieldGroups: ((data ?? []) as Record<string, unknown>[]).map(toFieldGroup) };
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
    return json(200, await route({ url, req, db: auth.supabase, userId: auth.user.id }));
  } catch (err) {
    if (err instanceof ApiError) return json(err.status, { error: err.message });
    console.error('[field-groups]', err);
    return json(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
