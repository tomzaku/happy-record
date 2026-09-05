import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Every backend call here is quiet: a failure resolves to null and this
// hook's own in-memory state is the fallback, unchanged.
import { fetchNoteFolders, removeNoteFolder as removeNoteFolderApi, saveNoteFolder } from './noteFolderApi';
import { noteFoldersKeys } from './noteFoldersKeys';

export type NoteFolder = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

type NoteFoldersMap = Record<string, NoteFolder>;
// Scoped to the one folder being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same resource shape, same fix) for why a global snapshot isn't safe under concurrent
// writes.
type RollbackContext = { previousFolder: NoteFolder | undefined };

export const useNoteFolder = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = noteFoldersKeys.list(userId);

  // Backed by React Query's own cache instead of useSessionStore — see useTags.tsx's own
  // comment on this exact shape (same resource pattern, ported from the same code).
  const { data: noteFolders = {} } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchNoteFolders();
      if (!result) throw new Error('Failed to fetch note folders');
      const map: NoteFoldersMap = {};
      for (const folder of result.folders) map[folder.id] = folder;
      return map;
    },
    enabled: ready && !!userId,
    staleTime: Infinity,
  });

  // Same optimistic-update shape as useTags.tsx's saveTagMutation — onMutate snapshots just the
  // one folder being written, onError rolls back only that key, and there's deliberately no
  // onSettled refetch (see useTags.tsx's own comment on why one isn't needed here either).
  const saveNoteFolderMutation = useMutation<{ ok: true }, Error, NoteFolder, RollbackContext>({
    mutationFn: async folder => {
      const result = await saveNoteFolder(folder);
      if (!result) throw new Error('Failed to save note folder');
      return result;
    },
    onMutate: async folder => {
      await queryClient.cancelQueries({ queryKey });
      const previousFolder = queryClient.getQueryData<NoteFoldersMap>(queryKey)?.[folder.id];
      queryClient.setQueryData<NoteFoldersMap>(queryKey, prev => ({ ...prev, [folder.id]: folder }));
      return { previousFolder };
    },
    onError: (_error, folder, context) => {
      queryClient.setQueryData<NoteFoldersMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previousFolder) {
          next[folder.id] = context.previousFolder;
        } else {
          delete next[folder.id];
        }
        return next;
      });
    },
  });

  const removeNoteFolderMutation = useMutation<{ ok: true }, Error, string, RollbackContext>({
    mutationFn: async id => {
      const result = await removeNoteFolderApi(id);
      if (!result) throw new Error('Failed to remove note folder');
      return result;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey });
      const previousFolder = queryClient.getQueryData<NoteFoldersMap>(queryKey)?.[id];
      queryClient.setQueryData<NoteFoldersMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return { previousFolder };
    },
    onError: (_error, id, context) => {
      if (!context?.previousFolder) return;
      const restored = context.previousFolder;
      queryClient.setQueryData<NoteFoldersMap>(queryKey, prev => ({ ...prev, [id]: restored }));
    },
  });

  // Returns just the new id (not the full folder) — matches the shape
  // useNoteManagerState.ts's own `addNoteFolder({ title: trimmed })` call already expects.
  const addNoteFolder = React.useCallback(
    (folder: Omit<NoteFolder, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const newFolder: NoteFolder = { ...folder, id: v4(), createdAt: now, updatedAt: now };
      saveNoteFolderMutation.mutate(newFolder);
      return newFolder.id;
    },
    [saveNoteFolderMutation],
  );

  const updateNoteFolder = React.useCallback(
    (folder: Partial<NoteFolder> & { id: string }) => {
      const existing = noteFolders[folder.id];
      if (!existing) return;
      const updated: NoteFolder = { ...existing, ...folder, updatedAt: new Date().toISOString() };
      saveNoteFolderMutation.mutate(updated);
    },
    [noteFolders, saveNoteFolderMutation],
  );

  const deleteNoteFolder = React.useCallback(
    (id: string) => {
      removeNoteFolderMutation.mutate(id);
    },
    [removeNoteFolderMutation],
  );

  const getAllNoteFolders = React.useCallback(() => {
    return Object.values(noteFolders).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [noteFolders]);

  const getNoteFolder = React.useCallback((id: string) => noteFolders[id], [noteFolders]);

  return {
    addNoteFolder,
    updateNoteFolder,
    deleteNoteFolder,
    getAllNoteFolders,
    getNoteFolder,
  };
};
