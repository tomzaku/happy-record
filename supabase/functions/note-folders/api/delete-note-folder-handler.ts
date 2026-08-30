// `DELETE /note-folders/:id` — idempotent. Notes in it just lose their folder (on delete set
// null). Always the caller's own row.

import { deleteNoteFolder } from '../repository/note-folders-repository.ts';
import type { Ctx } from './note-folders-context.ts';

export async function deleteNoteFolderHandler({ db, userId, id }: Ctx) {
  await deleteNoteFolder(db, userId, id!);
  return { ok: true };
}
