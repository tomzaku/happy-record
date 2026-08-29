import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchNotes, removeNote as removeNoteApi, saveNote } from './noteApi';

const NOTE_KEY = 'note';
const NOTE_LOADING_KEY = 'note_loading';

/**
 * Addressed by its own `id` — see 20260829010000_notes_note_id_ownership.sql: a field-group's
 * own note (`ownerType: 'field_group'`) is one persistent note, `field_groups.note_id` points at
 * it. A `type: 'note'` field's own value inside a checklist isn't this shape at all anymore —
 * see checklistRecordApi.ts and 20260829040000_notes_via_checklist_records.sql: the client sends
 * it as part of the same `records` array a metric field's value goes in, and `checklist-records`
 * routes it to `notes` itself. `ownerType`/`ownerId` (a denormalized reverse pointer, set once at
 * creation, never changed after — see 20260829020000_notes_title_search_owner.sql) is what a
 * search result resolves back to something openable with. `value` is the real, parsed Editor.js
 * `OutputData` every note editor in this app (@moon-ui/note-editor) actually produces —
 * noteApi.ts is the only place that ever stringifies/parses it against the `text` column backing
 * it server-side. `searchText` is plain text pulled out of `value`, computed server-side
 * (_shared/notes.ts's `computeSearchText`) — this client never sends or computes it, only ever
 * reads back whatever the server derived.
 */
export type Note = {
  id: string;
  value: unknown;
  title: string;
  searchText: string;
  ownerType: 'field' | 'field_group';
  ownerId: string;
  folderId?: string;
  checklistId?: string;
  checklistTemplateId?: string;
  createdAt: string;
  updatedAt: string;
};

/** What a note-owning component has to supply the moment it actually creates a note — see
 * createNote below. A field's own single current note (standalone notebook) omits
 * `checklistId`/`checklistTemplateId`; a field-group's own note sets `checklistTemplateId`. */
export type NoteOrigin =
  | { ownerType: 'field'; ownerId: string; checklistId?: string; checklistTemplateId?: string }
  | { ownerType: 'field_group'; ownerId: string; checklistTemplateId: string };

// Ids already fetched (or created locally, which counts as "fetched" — see createNote) this page
// load, so the same id isn't re-requested every call. Separate from the reactive `loadingIds`
// store below: this is only ever a write-once dedup key, never rendered.
const fetchedIds = new Set<string>();

/**
 * The notebook's own store — not `checklist_records`, and not jsonb on `checklist_templates`
 * either. See the migrations (20260821010000_notes.sql, 20260829010000_notes_note_id_ownership.sql,
 * 20260829020000_notes_title_search_owner.sql) for why every standalone/field-group note ended up
 * here, addressed by a plain `notes.id` that whoever owns it (a field, a field group) points at
 * with its own `note_id`.
 */
export const useNote = () => {
  const [notes, setNotes] = useSessionStore<Record<string, Note>>(NOTE_KEY, {});
  // Reactive (unlike `fetchedIds` above) — this is what lets a consumer render a loading state
  // on its editor while a note it already has the id for is still in flight.
  const [loadingIds, setLoadingIds] = useSessionStore<Record<string, boolean>>(NOTE_LOADING_KEY, {});
  const { ready } = useSession();

  const setLoading = (ids: string[], value: boolean) => {
    setLoadingIds(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of ids) {
        if (!!next[id] !== value) {
          next[id] = value;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const mergeFetched = (result: { notes: Note[] } | null, requestedIds: string[]) => {
    setLoading(requestedIds, false);
    if (!result) {
      for (const id of requestedIds) fetchedIds.delete(id);
      return;
    }
    if (!result.notes.length) return;
    setNotes(prev => {
      const merged = { ...prev };
      let changed = false;
      for (const note of result.notes) {
        const existing = merged[note.id];
        if (!existing || new Date(note.updatedAt) > new Date(existing.updatedAt)) {
          merged[note.id] = note;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
  };

  /**
   * A single note, by id — the shape every note-owning component (a field group) actually
   * needs: "do I have a `noteId`? If so, is its content here yet, and is it still loading?"
   * `noteId` undefined means the owner has no note yet (nothing to fetch, not loading).
   */
  const getNote = React.useCallback(
    (noteId: string | undefined): { note: Note | undefined; loading: boolean } => {
      if (!noteId) return { note: undefined, loading: false };
      if (ready && !notes[noteId] && !fetchedIds.has(noteId)) {
        fetchedIds.add(noteId);
        setLoading([noteId], true);
        fetchNotes({ ids: [noteId] }).then(result => mergeFetched(result, [noteId]));
      }
      return { note: notes[noteId], loading: !!loadingIds[noteId] };
    },
    [notes, loadingIds, ready, setNotes, setLoadingIds],
  );

  /** Several notes at once, by id — the standalone notebook's own listing (useNoteRecord.tsx):
   * one call for every note-type field's `noteId` instead of one request per field. */
  const getNotesByIds = React.useCallback(
    (ids: (string | undefined)[]): Note[] => {
      const uniqueIds = [...new Set(ids.filter((id): id is string => !!id))].sort();
      const missing = uniqueIds.filter(id => !notes[id] && !fetchedIds.has(id));
      if (ready && missing.length) {
        missing.forEach(id => fetchedIds.add(id));
        fetchNotes({ ids: missing }).then(result => mergeFetched(result, missing));
      }
      return uniqueIds.map(id => notes[id]).filter((n): n is Note => !!n);
    },
    [notes, ready, setNotes],
  );

  /** Title/search_text substring match, most recently updated first — a search UI's own results
   * list. Not part of the scoped-fetch-by-query-key pattern the read functions above use (a
   * search query changes on every keystroke; there's nothing sensible to dedupe against) — a
   * plain async call, merging what comes back into the store same as everywhere else. */
  const searchNotes = async (query: string, limit?: number): Promise<Note[]> => {
    const result = await fetchNotes({ q: query, limit });
    if (result) mergeFetched(result, []);
    return result?.notes ?? [];
  };

  /** Creates a new note and returns it — the caller persists its `id` onto its own owner right
   * after (`updateFieldGroup`). Marked "already fetched" immediately: this device just wrote it,
   * there's nothing to fetch. `searchText` starts empty locally (this optimistic copy) — the
   * server computes the real one from `value` on its own next fetch; nothing here trusts this
   * local placeholder for anything. */
  const createNote = (value: unknown, origin: NoteOrigin, title = '') => {
    const id = v4();
    const now = new Date().toISOString();
    const note: Note = {
      id,
      value,
      title,
      searchText: '',
      ownerType: origin.ownerType,
      ownerId: origin.ownerId,
      ...(origin.ownerType === 'field_group'
        ? { checklistTemplateId: origin.checklistTemplateId }
        : {
          ...(origin.checklistId ? { checklistId: origin.checklistId } : {}),
          ...(origin.checklistTemplateId ? { checklistTemplateId: origin.checklistTemplateId } : {}),
        }),
      createdAt: now,
      updatedAt: now,
    };
    fetchedIds.add(id);
    setNotes(prev => ({ ...prev, [id]: note }));
    saveNote(note);
    return note;
  };

  const updateNote = (
    id: string,
    updates: Partial<Pick<Note, 'value' | 'folderId' | 'title'>>,
  ) => {
    let updated: Note | null = null;
    setNotes(prev => {
      if (!prev[id]) return prev;
      updated = {
        ...prev[id],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      return { ...prev, [id]: updated };
    });
    if (updated) saveNote(updated);
    return updated;
  };

  const deleteNote = (id: string) => {
    setNotes(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    removeNoteApi(id);
  };

  return {
    notes,
    getNote,
    getNotesByIds,
    searchNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};
