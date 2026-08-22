import React from 'react';
import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
import { fetchNoteFolders, removeNoteFolder as removeNoteFolderApi, saveNoteFolder } from './noteFolderApi';

const NOTE_FOLDER_KEY = 'note_folder';

export type NoteFolder = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

// One flag for the whole page load — see the same guard in useRecordField.tsx.
let noteFoldersSynced = false;

export const useNoteFolder = () => {
  const [noteFolders, setNoteFolders] = useLocalStorage<
    Record<string, NoteFolder>
  >(NOTE_FOLDER_KEY, {});

  React.useEffect(() => {
    if (noteFoldersSynced) return;
    noteFoldersSynced = true;
    fetchNoteFolders().then(result => {
      if (!result) {
        noteFoldersSynced = false;
        return;
      }
      // Only fills in folders this device doesn't already have — an
      // unsynced local edit always wins over a stale server copy.
      setNoteFolders(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const folder of result.folders) {
          if (!merged[folder.id]) {
            merged[folder.id] = folder;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    });
  }, []);

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

  const getAllNoteFolders = () => {
    return Object.values(noteFolders).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  };

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
