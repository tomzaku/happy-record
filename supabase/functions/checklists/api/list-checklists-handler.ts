// `GET /checklists` — one route, two shapes depending on the query string. Always the caller's
// own — no cross-user visibility rule, nothing to compose a `checkPermission` around (a checklist
// is one user's own day-instance of a template, never shared directly; a challenge dashboard's
// own peer-read of *other* participants' checklists happens in `challenges/index.ts`, on its own
// explicit query).

import { toChecklist } from '../model/checklists-model.ts';
import type { Ctx } from './checklists-context.ts';

const MAX_LIMIT = 2000;

/** `?id=` — the shape `detail-task-page` needs: it already knows the exact checklist id from the
 * URL, no reason to fetch a whole range and filter client-side. */
async function getChecklistById({ db, userId, url }: Ctx) {
  const id = url.searchParams.get('id')!;
  const { data, error } = await db.from('checklists').select('*').eq('user_id', userId).eq('id', id).limit(1);
  if (error) throw new Error(error.message);
  return { checklists: ((data ?? []) as Record<string, unknown>[]).map(toChecklist) };
}

/** No `id` — optionally scoped to one template and/or a `started_at` range. */
async function listChecklistsInRange({ db, userId, url }: Ctx) {
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

export async function listChecklistsHandler(ctx: Ctx) {
  return ctx.url.searchParams.get('id') ? getChecklistById(ctx) : listChecklistsInRange(ctx);
}
