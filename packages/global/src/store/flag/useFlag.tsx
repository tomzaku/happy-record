import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Every backend call here is quiet: a failure resolves to null and this
// hook's own in-memory state is the fallback, unchanged.
import { fetchFlags, removeFlag as removeFlagApi, saveFlag } from './flagApi';
import { flagsKeys } from './flagsKeys';

/**
 * A real grouping entity for checklist templates — one flag groups many
 * templates (ChecklistTemplate.flagId), unlike the free-text
 * ChecklistTemplate.tags array. "Push-ups" and "Pull-ups" both pointing at
 * a "Gym" flag is the motivating case.
 */
export type Flag = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
};

type FlagsMap = Record<string, Flag>;
// Scoped to the one flag being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same resource shape, same fix) for why a global snapshot isn't safe under concurrent
// writes.
type RollbackContext = { previousFlag: Flag | undefined };

export const useFlag = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const queryKey = flagsKeys.list(userId);

  // Backed by React Query's own cache instead of useSessionStore — see useTags.tsx's own
  // comment on this exact shape (same resource pattern, ported from the same code).
  const { data: flags = {} } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchFlags();
      if (!result) throw new Error('Failed to fetch flags');
      const map: FlagsMap = {};
      for (const flag of result.flags) map[flag.id] = flag;
      return map;
    },
    enabled: ready && !!userId,
    staleTime: Infinity,
  });

  // Same optimistic-update shape as useTags.tsx's saveTagMutation — onMutate snapshots just the
  // one flag being written, onError rolls back only that key, and there's deliberately no
  // onSettled refetch (see useTags.tsx's own comment on why one isn't needed here either: the
  // object sent is exactly what gets persisted, and a follow-up refetch could otherwise wipe a
  // different, still-in-flight write before its own save has landed).
  const saveFlagMutation = useMutation<{ ok: true }, Error, Flag, RollbackContext>({
    mutationFn: async flag => {
      const result = await saveFlag(flag);
      if (!result) throw new Error('Failed to save flag');
      return result;
    },
    onMutate: async flag => {
      await queryClient.cancelQueries({ queryKey });
      const previousFlag = queryClient.getQueryData<FlagsMap>(queryKey)?.[flag.id];
      queryClient.setQueryData<FlagsMap>(queryKey, prev => ({ ...prev, [flag.id]: flag }));
      return { previousFlag };
    },
    onError: (_error, flag, context) => {
      queryClient.setQueryData<FlagsMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previousFlag) {
          next[flag.id] = context.previousFlag;
        } else {
          delete next[flag.id];
        }
        return next;
      });
    },
  });

  const removeFlagMutation = useMutation<{ ok: true }, Error, string, RollbackContext>({
    mutationFn: async id => {
      const result = await removeFlagApi(id);
      if (!result) throw new Error('Failed to remove flag');
      return result;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey });
      const previousFlag = queryClient.getQueryData<FlagsMap>(queryKey)?.[id];
      queryClient.setQueryData<FlagsMap>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return { previousFlag };
    },
    onError: (_error, id, context) => {
      if (!context?.previousFlag) return;
      const restored = context.previousFlag;
      queryClient.setQueryData<FlagsMap>(queryKey, prev => ({ ...prev, [id]: restored }));
    },
  });

  const addFlag = React.useCallback(
    (data: { name: string; description?: string }) => {
      const now = new Date().toISOString();
      const flag: Flag = { ...data, id: v4(), createdAt: now, updatedAt: now };
      saveFlagMutation.mutate(flag);
      return flag;
    },
    [saveFlagMutation],
  );

  const updateFlag = React.useCallback(
    (id: string, updates: Partial<Pick<Flag, 'name' | 'description'>>) => {
      const existing = flags[id];
      if (!existing) return null;
      const updated: Flag = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      saveFlagMutation.mutate(updated);
      return updated;
    },
    [flags, saveFlagMutation],
  );

  const deleteFlag = React.useCallback(
    (id: string) => {
      removeFlagMutation.mutate(id);
    },
    [removeFlagMutation],
  );

  const getAllFlags = React.useCallback(() => {
    return Object.values(flags).sort((a, b) => a.name.localeCompare(b.name));
  }, [flags]);

  const getFlag = React.useCallback((id: string) => flags[id], [flags]);

  return {
    addFlag,
    updateFlag,
    deleteFlag,
    getAllFlags,
    getFlag,
  };
};
