// `GET /note-folders` — always the caller's own, nothing to compose a `checkPermission` around.

import { toNoteFolder } from '../../../dto/note-folders/note-folders-dto.ts';
import { fetchNoteFolders } from '../repository/note-folders-repository.ts';
import type { Ctx } from './note-folders-context.ts';

export async function listNoteFoldersHandler({ db, userId }: Ctx) {
  const rows = await fetchNoteFolders(db, userId);
  return { folders: rows.map(toNoteFolder) };
}
