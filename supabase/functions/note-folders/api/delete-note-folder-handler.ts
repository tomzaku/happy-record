// `DELETE /note-folders/:id` — idempotent. Notes in it just lose their folder (on delete set
// null). Always the caller's own row.

import { deleteNoteFolder } from '../services/note-folders-service.ts';
import type { Ctx } from './note-folders-context.ts';

export async function deleteNoteFolderHandler(ctx: Ctx) {
  await deleteNoteFolder(ctx, ctx.id!);
  return { ok: true };
}
