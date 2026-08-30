// `POST /notes { note }` — `compose(checkWriteNote, saveNoteCore)`: checkWriteNote (see
// notes-permissions.ts) parses the body and confirms ownership of an existing id; this is just
// the write itself once that's settled.

import { ApiError } from '../../_shared/cors.ts';
import { compose } from '../../_shared/authorize.ts';
import { fromNote } from '../../_shared/notes.ts';
import { checkWriteNote, type WriteAuthorization } from '../services/notes-access-service.ts';
import type { Ctx } from './notes-context.ts';

async function saveNoteCore({ db, userId }: Ctx, { entry }: WriteAuthorization) {
  let row: ReturnType<typeof fromNote>;
  try {
    row = fromNote(entry);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid note.');
  }

  const { error } = await db.from('notes').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);

  // A journal entry (checklist_id set) has a paired `checklist_records` row — same id, per
  // checklist-records/index.ts's own fromChecklistFieldNoteEntry — whose own `updated_at` needs
  // bumping too, or that row's own last-write-wins merge on the checklist side won't realize
  // this edit (landing here, not through checklist-records' own PATCH) is newer than what it
  // already has cached. Mirrors checklist-records/index.ts's own update(), which already does
  // the same thing in the other direction.
  if (row.checklist_id) {
    const { error: bumpError } = await db
      .from('checklist_records')
      .update({ updated_at: row.updated_at })
      .eq('user_id', userId)
      .eq('id', row.id);
    if (bumpError) throw new Error(bumpError.message);
  }

  return { ok: true };
}

export const saveNoteHandler = compose(checkWriteNote, saveNoteCore);
