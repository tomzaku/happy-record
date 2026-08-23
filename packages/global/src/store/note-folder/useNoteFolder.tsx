import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchNoteFolders, removeNoteFolder as removeNoteFolderApi, saveNoteFolder } from './noteFolderApi';

const NOTE_FOLDER_KEY = 'note_folder';

export type NoteFolder = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

// Fetched once per identity ("all mine" — no consumer narrows this today),
// not unconditionally on mount.
const fetchedFor = new Set<string | undefined>();

export const useNoteFolder = () => {
  const [noteFolders, setNoteFolders] = useSessionStore<Record<string, NoteFolder>>(
    NOTE_FOLDER_KEY,
    {},
  );
  const { userId, ready } = useSession();

  const addNoteFolder = (
    folder: Omit<NoteFolder, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const id = v4();
    const now = new Date().toISOString();
    const newFolder: NoteFolder = {
      ...folder,
      id,
      createdAt: now,
      updatedAt: now,
    };
    setNoteFolders(prev => ({
      ...prev,
      [id]: newFolder,
    }));
    saveNoteFolder(newFolder);
    return id;
  };

  const updateNoteFolder = (folder: Partial<NoteFolder> & { id: string }) => {
    let updated: NoteFolder | null = null;
    setNoteFolders(prev => {
      updated = {
        ...prev[folder.id],
        ...folder,
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [folder.id]: updated,
      };
    });
    if (updated) saveNoteFolder(updated);
  };

  const deleteNoteFolder = (id: string) => {
    setNoteFolders(prev => {
      const newFolders = { ...prev };
      delete newFolders[id];
      return newFolders;
    });
    removeNoteFolderApi(id);
  };

  const getAllNoteFolders = React.useCallback(() => {
    if (ready && !fetchedFor.has(userId)) {
      fetchedFor.add(userId);
      fetchNoteFolders().then(result => {
        if (!result) {
          fetchedFor.delete(userId);
          return;
        }
        if (!result.folders.length) return;
        setNoteFolders(prev => {
          const merged = { ...prev };
          let changed = false;
          for (const folder of result.folders) {
            const existing = merged[folder.id];
            if (!existing || new Date(folder.updatedAt) > new Date(existing.updatedAt)) {
              merged[folder.id] = folder;
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      });
    }
    return Object.values(noteFolders).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [noteFolders, userId, ready, setNoteFolders]);

  const getNoteFolder = (id: string) => {
    return noteFolders[id];
  };

  return {
    addNoteFolder,
    updateNoteFolder,
    deleteNoteFolder,
    getAllNoteFolders,
    getNoteFolder,
  };
};
