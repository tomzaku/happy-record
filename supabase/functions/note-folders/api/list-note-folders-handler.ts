// `GET /note-folders` — always the caller's own, nothing to compose a `checkPermission` around.

import { toNoteFolder } from '../model/note-folders-model.ts';
import type { Ctx } from './note-folders-context.ts';

export async function listNoteFoldersHandler({ db, userId }: Ctx) {
  const { data, error } = await db
    .from('note_folders')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return { folders: ((data ?? []) as Record<string, unknown>[]).map(toNoteFolder) };
}
