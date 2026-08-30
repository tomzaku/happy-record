// `POST /note-folders { folder }` — always the caller's own (hardcoded `user_id` below).

import { ApiError } from '../../../shared/cors.ts';
import { fromNoteFolder } from '../model/note-folders-model.ts';
import { body, type Ctx } from './note-folders-context.ts';

export async function saveNoteFolderHandler({ req, db, userId }: Ctx) {
  const entry = (await body(req)).folder;
  if (!entry || typeof entry !== 'object') throw new ApiError(400, 'Missing folder.');

  let row: ReturnType<typeof fromNoteFolder>;
  try {
    row = fromNoteFolder(entry as Record<string, unknown>);
  } catch (err) {
    throw new ApiError(400, err instanceof Error ? err.message : 'Invalid folder.');
  }

  const { error } = await db.from('note_folders').upsert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
  return { ok: true };
}
