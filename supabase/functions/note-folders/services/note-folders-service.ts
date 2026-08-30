// Business logic for `note-folders`, between `api/` and `repository/note-folders-repository.ts`
// — no real cross-user visibility decision here, so this stays a thin pass-through, but `api/`
// still never queries the DB directly: it always goes through this layer.

import { fetchNoteFolders, removeNoteFolder, upsertNoteFolder } from '../repository/note-folders-repository.ts';
import type { Ctx } from '../api/note-folders-context.ts';

export function listNoteFolders({ db, userId }: Ctx): Promise<Record<string, unknown>[]> {
  return fetchNoteFolders(db, userId);
}

export function saveNoteFolder({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  return upsertNoteFolder(db, userId, row);
}

export function deleteNoteFolder({ db, userId }: Ctx, id: string): Promise<void> {
  return removeNoteFolder(db, userId, id);
}
