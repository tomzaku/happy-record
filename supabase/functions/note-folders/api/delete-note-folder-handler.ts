// `DELETE /note-folders ?id=` — idempotent. Notes in it just lose their folder (on delete set
// null). Always the caller's own row.

import { ApiError } from '../../../shared/cors.ts';
import type { Ctx } from './note-folders-context.ts';

export async function deleteNoteFolderHandler({ url, db, userId }: Ctx) {
  const id = url.searchParams.get('id');
  if (!id) throw new ApiError(400, 'Missing id.');
  const { error } = await db.from('note_folders').delete().eq('user_id', userId).eq('id', id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
