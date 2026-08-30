// `POST /field-groups { fieldGroup }` — full-row upsert (create, edit, set/clear noteId, or set
// archivedAt for a soft delete — there's no hard-delete route). Always the caller's own
// (hardcoded `user_id` below).

import { ApiError } from '../../../shared/cors.ts';
import { saveRepeat } from '../../../shared/repeats.ts';
import { fromFieldGroup } from '../model/field-groups-model.ts';
import { body, type Ctx } from './field-groups-context.ts';

export async function saveFieldGroupHandler({ req, db, userId }: Ctx) {
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
