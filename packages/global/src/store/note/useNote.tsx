import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
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

// Fetched by whatever scope is actually asked for (a set of field ids) —
// never unconditionally on mount. Keyed so the same (identity, scope)
// tuple isn't re-fetched every call within a page load.
const fetchedScopes = new Set<string>();

/**
 * The notebook's own store — not `checklist_records`. See the migration
 * (supabase/migrations/20260821010000_notes.sql) for why notes got split
 * out: a note never belongs to a checklist, and the old
 * checklistId/checklistTemplateId: '' the client used to send would never
 * have synced against that schema's foreign keys.
 */
export const useNote = () => {
  const [notes, setNotes] = useSessionStore<Record<string, Note>>(NOTE_KEY, {});
  const { userId, ready } = useSession();

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

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `notes` itself
  // changes, instead of on every render. Actually calls the backend scoped
  // by `fieldIds` now (it already supports this) rather than fetching
  // everything once and filtering client-side.
  const getNotes = React.useCallback(
    (fieldIds: string[]) => {
      const sortedIds = [...fieldIds].sort();
      const scopeKey = JSON.stringify({ userId, fieldIds: sortedIds });
      if (ready && sortedIds.length && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchNotes({ fieldIds: sortedIds }).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
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
        });
      }
      return Object.values(notes).filter(note => fieldIds.includes(note.fieldId));
    },
    [notes, userId, ready, setNotes],
  );

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    getNotes,
  };
};
