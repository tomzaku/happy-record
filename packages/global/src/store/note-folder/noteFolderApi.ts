// Client for the `note-folders` resource. See CLAUDE.md — nothing else
// should touch that table. Quiet throughout — useNoteFolder.tsx's own
// useLocalStorage state is the fallback.

import { request } from '../../lib/api';
import type { NoteFolder } from './useNoteFolder';

export function fetchNoteFolders(): Promise<{ folders: NoteFolder[] } | null> {
  return request.get('/note-folders', { quiet: true });
}

export function saveNoteFolder(folder: NoteFolder): Promise<{ ok: true } | null> {
  return request.post('/note-folders', { folder }, { quiet: true });
}

export function removeNoteFolder(id: string): Promise<{ ok: true } | null> {
  return request.delete('/note-folders', { quiet: true, params: { id } });
}
