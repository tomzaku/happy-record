// Client for the `notes` resource. See CLAUDE.md — nothing else should
// touch that table. Quiet throughout — useNote.tsx's own useLocalStorage
// state is the fallback.
//
// `notes.value` is a `text` column server-side, but every note editor in this app
// (@moon-ui/note-editor) hands back real Editor.js `OutputData` (an object), never a string —
// this module is where that gets reconciled, once, for every note surface: `Note['value']` is
// `unknown` (the real, parsed content, ready to hand straight to a `NoteEditor`), and this file
// alone stringifies going out / parses coming back. Nothing above this layer should JSON.stringify
// or JSON.parse a note's value itself.

import { request } from '../../lib/api';
import type { Note } from './useNote';

type WireNote = Omit<Note, 'value'> & { value: string };

/** Tolerant of a value that was never real JSON to begin with (a legacy plain-text note written
 * before this existed) — kept as-is rather than discarded, same tolerance the server's own
 * `toBlocks` (_shared/aiNoteGeneration.ts) already has for the same reason. */
function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toWireNote(note: Note): WireNote {
  return { ...note, value: JSON.stringify(note.value ?? null) };
}

function fromWireNote(note: WireNote): Note {
  return { ...note, value: parseValue(note.value) };
}

/** `id` → one note, `ids` → several at once (batched, not one request per id — see
 * useNote.tsx's getNotesByIds), `ownerIds` + `checklistId`/(`checklistTemplateId`+`from`/`to`) →
 * a checklist's own journal entries for those fields (see useNote.tsx's
 * getChecklistFieldNotes/getChecklistFieldNotesInRange), `q` → a title/search_text substring
 * match (see useNote.tsx's searchNotes). */
export function fetchNotes(
  opts: {
    id?: string;
    ids?: string[];
    ownerIds?: string[];
    checklistId?: string;
    checklistTemplateId?: string;
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
  },
): Promise<{ notes: Note[] } | null> {
  return request
    .get<{ notes: WireNote[] }>('/notes', {
      quiet: true,
      params: {
        id: opts.id,
        ids: opts.ids?.length ? opts.ids.join(',') : undefined,
        ownerIds: opts.ownerIds?.length ? opts.ownerIds.join(',') : undefined,
        checklistId: opts.checklistId,
        checklistTemplateId: opts.checklistTemplateId,
        from: opts.from,
        to: opts.to,
        q: opts.q,
        limit: opts.limit,
      },
    })
    .then(result => (result ? { notes: result.notes.map(fromWireNote) } : null));
}

export function saveNote(note: Note): Promise<{ ok: true } | null> {
  return request.post('/notes', { note: toWireNote(note) }, { quiet: true });
}

export function removeNote(id: string): Promise<{ ok: true } | null> {
  return request.delete('/notes', { quiet: true, params: { id } });
}
