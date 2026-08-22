import { useSyncedCollection, type SyncState } from '../../hook';
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

// Shared across every mounted instance of this store — see useSyncedCollection.
const noteFoldersSyncState: SyncState = { current: null };

export const useNoteFolder = () => {
  const [noteFolders, setNoteFolders] = useSyncedCollection<NoteFolder>(
    NOTE_FOLDER_KEY,
    noteFoldersSyncState,
    async () => (await fetchNoteFolders())?.folders ?? null,
  );

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
