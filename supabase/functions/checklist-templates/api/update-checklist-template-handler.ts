// `PATCH /checklist-templates { id, ...changes }` — edits only the fields the caller actually
// changed — a schedule/tag/flag edit sends a diff, not the whole template, so an in-flight edit
// to a field nobody touched here can't get clobbered by a stale client copy the way the save
// handler's full-row upsert would.
//
// `repeat` is deliberately not gated by the same `.eq('user_id', userId)` ownership check as the
// rest of `patch` — `saveRepeat` always writes to the *caller's own* row (see its own comment),
// so a challenge participant PATCHing `{ id: <the owner's template id>, repeat: {...} }` sets
// their own personal reminder time without touching the owner's schedule or needing to own the
// template at all; sending anything else in the same call (title, tags, ...) still silently
// no-ops for them, since that part of the update only ever matches the owner's own row.

import { ApiError } from '../../../shared/cors.ts';
import { saveRepeat } from '../../../shared/repeats.ts';
import { patchChecklistTemplate } from '../model/checklist-templates-model.ts';
import { body, type Ctx } from './checklist-templates-context.ts';

export async function updateChecklistTemplateHandler({ req, db, userId }: Ctx) {
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
