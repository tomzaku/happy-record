// `DELETE /notes ?id=` — `compose(checkDeleteNote, removeNoteCore)`: checkDeleteNote (see
// notes-permissions.ts) loads the row and confirms ownership (or that it's already gone); this
// is just the deletion itself once that's settled.

import { compose } from '../../../shared/authorize.ts';
import { checkDeleteNote, type NoteRow } from '../services/notes-access-service.ts';
import type { Ctx } from './notes-context.ts';

/** A journal entry's paired `checklist_records` row (same id, see save-note-handler.ts's own
 * comment) has to go first, explicitly — `checklist_records.note_id` is `on delete set null`, but
 * that FK action alone would leave a row with `note_id`, `value_number`, and `value_text` all
 * null at once, which fails `checklist_records_value_shape`'s own CHECK and would abort this
 * delete entirely. Deleting the pointer row directly (harmless no-op for a standalone/field-group
 * note, which never has one) sidesteps that path the same way checklist-records/index.ts's own
 * remove() already does. */
async function removeNoteCore({ db, userId, url }: Ctx, existing: NoteRow | null) {
  if (!existing) return { ok: true };
  const id = url.searchParams.get('id')!;
  const { error: recordError } = await db.from('checklist_records').delete().eq('user_id', userId).eq('id', id);
  if (recordError) throw new Error(recordError.message);
  const { error } = await db.from('notes').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const deleteNoteHandler = compose(checkDeleteNote, removeNoteCore);
