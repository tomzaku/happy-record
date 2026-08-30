// `GET /note-folders` — always the caller's own, nothing to compose a `checkPermission` around.

import { toNoteFolder } from '../../../dto/note-folders/note-folders-dto.ts';
import { listNoteFolders } from '../services/note-folders-service.ts';
import type { Ctx } from './note-folders-context.ts';

export async function listNoteFoldersHandler(ctx: Ctx) {
  const rows = await listNoteFolders(ctx);
  return { folders: rows.map(toNoteFolder) };
}
