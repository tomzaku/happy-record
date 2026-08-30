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

// `value` is absent on the wire entirely for a summary row (a getAllNotes/searchNotes result —
// see notes/index.ts's own toNoteSummary) rather than sent as `null`/empty, so this has to stay
// optional, not just nullable — `fromWireNote` below only touches it when it's actually there.
type WireNote = Omit<Note, 'value'> & { value?: string };

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

/** Leaves `value` as `undefined` for a summary row rather than calling parseValue on a value
 * that was never sent — see WireNote's own comment. */
function fromWireNote(note: WireNote): Note {
  return note.value === undefined ? (note as Note) : { ...note, value: parseValue(note.value) };
}

/** One note by its own id, full content (`value` included) — a real `GET /notes/:id`, not the
 * collection route with a query filter (see CLAUDE.md's "Write them as normal REST APIs"). */
export function fetchNoteById(id: string): Promise<{ notes: Note[] } | null> {
  return request
    .get<{ notes: WireNote[] }>(`/notes/${encodeURIComponent(id)}`, { quiet: true })
    .then(result => (result ? { notes: result.notes.map(fromWireNote) } : null));
}

/** `ids` → several at once (batched, not one request per id — see useNote.tsx's getNotesByIds),
 * `q` → a title/search_text substring match (see useNote.tsx's searchNotes), neither → every
 * note this user owns (see useNote.tsx's getAllNotes) — standalone, a field-group's own Home
 * note, and every checklist journal entry alike, since they're all just rows in this one table
 * regardless of which surface created them. The `ids` shape returns full content (`value`
 * included); `q` and the unscoped "all" shape return summaries only — see toNoteSummary's own
 * comment. A single note by its own id is `fetchNoteById` above, not this. */
export function fetchNotes(
  opts: {
    ids?: string[];
    q?: string;
    limit?: number;
  } = {},
): Promise<{ notes: Note[] } | null> {
  return request
    .get<{ notes: WireNote[] }>('/notes', {
      quiet: true,
      params: {
        ids: opts.ids?.length ? opts.ids.join(',') : undefined,
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
  return request.delete(`/notes/${encodeURIComponent(id)}`, { quiet: true });
}
