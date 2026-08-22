// Client for the `notes` resource. See CLAUDE.md — nothing else should
// touch that table. Quiet throughout — useNote.tsx's own useLocalStorage
// state is the fallback.

import { request } from '../../lib/api';
import type { Note } from './useNote';

export function fetchNotes(opts: {
  fieldIds?: string[];
  folderId?: string;
  limit?: number;
} = {}): Promise<{ notes: Note[] } | null> {
  return request.get('/notes', {
    quiet: true,
    params: {
      fieldIds: opts.fieldIds?.length ? opts.fieldIds.join(',') : undefined,
      folderId: opts.folderId,
      limit: opts.limit,
    },
  });
}

export function saveNote(note: Note): Promise<{ ok: true } | null> {
  return request.post('/notes', { note }, { quiet: true });
}

export function removeNote(id: string): Promise<{ ok: true } | null> {
  return request.delete('/notes', { quiet: true, params: { id } });
}
