// `DELETE /notes/:id` — `compose(checkDeleteNote, removeNoteCore)`: checkDeleteNote (see
// services/notes-access-service.ts) loads the row and confirms ownership (or that it's already
// gone); this is just the deletion itself once that's settled, via services/notes-service.ts.

import { compose } from '../../../shared/authorize.ts';
import { checkDeleteNote, type NoteRow } from '../services/notes-access-service.ts';
import { deleteNote } from '../services/notes-service.ts';
import type { Ctx } from './notes-context.ts';

async function removeNoteCore(ctx: Ctx, existing: NoteRow | null) {
  await deleteNote(ctx, existing);
  return { ok: true };
}

export const deleteNoteHandler = compose(checkDeleteNote, removeNoteCore);
