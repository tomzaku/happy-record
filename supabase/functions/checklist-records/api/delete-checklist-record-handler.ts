// `DELETE /checklist-records ?id=` — idempotent, always the caller's own row(s).

import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from './checklist-records-context.ts';

/** Deletes the `checklist_records` row first (harmless no-op if this id was never one), then
 * `notes` (harmless no-op for a plain number/text/date/datetime record's own id) —
 * `checklist_records.note_id` is `on delete set null`, so order doesn't matter for the FK, but
 * deleting the pointer before the content it points at reads more naturally than the reverse. */
export async function deleteChecklistRecordHandler({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: noteError } = await db.from('notes').delete().eq('user_id', userId).eq('id', id);
  if (noteError) throw new Error(noteError.message);
  return { ok: true };
}
