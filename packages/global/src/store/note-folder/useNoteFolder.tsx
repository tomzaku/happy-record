import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

const NOTE_FOLDER_KEY = 'note_folder';

export type NoteFolder = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

export const useNoteFolder = () => {
  const [noteFolders, setNoteFolders] = useLocalStorage<
    Record<string, NoteFolder>
  >(NOTE_FOLDER_KEY, {});

  const addNoteFolder = (
    folder: Omit<NoteFolder, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const id = v4();
    const now = new Date().toISOString();
    setNoteFolders(prev => ({
      ...prev,
      [id]: {
        ...folder,
        id,
        createdAt: now,
        updatedAt: now,
      },
    }));
    return id;
  };

  const updateNoteFolder = (folder: Partial<NoteFolder> & { id: string }) => {
    setNoteFolders(prev => ({
      ...prev,
      [folder.id]: {
        ...prev[folder.id],
        ...folder,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const deleteNoteFolder = (id: string) => {
    setNoteFolders(prev => {
      const newFolders = { ...prev };
      delete newFolders[id];
      return newFolders;
    });
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
