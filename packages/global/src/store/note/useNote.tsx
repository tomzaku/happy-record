import { useLocalStorage, useSyncOncePerIdentity, type SyncState } from '../../hook';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
import { fetchNotes, removeNote as removeNoteApi, saveNote } from './noteApi';

const NOTE_KEY = 'note';

export type Note = {
  id: string;
  fieldId: string;
  value: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
};

type NoteStore = Record<string, Note>;

// Shared across every mounted instance of this store — see useSyncOncePerIdentity.
const notesSyncState: SyncState = { current: null };

/**
 * The notebook's own store — not `checklist_records`. See the migration
 * (supabase/migrations/20260821010000_notes.sql) for why notes got split
 * out: a note never belongs to a checklist, and the old
 * checklistId/checklistTemplateId: '' the client used to send would never
 * have synced against that schema's foreign keys.
 */
export const useNote = () => {
  const [notes, setNotes] = useLocalStorage<NoteStore>(NOTE_KEY, {});

  useSyncOncePerIdentity(notesSyncState, async () => {
    const result = await fetchNotes();
    if (!result) return false;
    // Only fills in notes this device doesn't already have — an
    // unsynced local edit always wins over a stale server copy.
    setNotes(prev => {
      const merged = { ...prev };
      let changed = false;
      for (const note of result.notes) {
        if (!merged[note.id]) {
          merged[note.id] = note;
          changed = true;
        }
      }
      return changed ? merged : prev;
    });
    return true;
  });

  const addNote = (data: { fieldId: string; value: string; folderId?: string }) => {
    const id = v4();
    const now = new Date().toISOString();
    const note: Note = { ...data, id, createdAt: now, updatedAt: now };
    setNotes(prev => ({ ...prev, [id]: note }));
    saveNote(note);
    return note;
  };

  const updateNote = (id: string, updates: Partial<Pick<Note, 'value' | 'folderId'>>) => {
    let updated: Note | null = null;
    setNotes(prev => {
      if (!prev[id]) return prev;
      updated = { ...prev[id], ...updates, updatedAt: new Date().toISOString() };
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

  const getNotes = (fieldIds: string[]) => {
    return Object.values(notes).filter(note => fieldIds.includes(note.fieldId));
  };

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    getNotes,
  };
};
