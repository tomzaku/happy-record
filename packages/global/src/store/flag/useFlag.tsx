import React from 'react';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchFlags, removeFlag as removeFlagApi, saveFlag } from './flagApi';

const FLAG_KEY = 'flag';

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

// Fetched once per identity ("all mine" — no consumer narrows this today),
// not unconditionally on mount.
const fetchedFor = new Set<string | undefined>();

export const useFlag = () => {
  const [flags, setFlags] = useSessionStore<Record<string, Flag>>(FLAG_KEY, {});
  const { userId, ready } = useSession();

  const addFlag = (data: { name: string; description?: string }) => {
    const id = v4();
    const now = new Date().toISOString();
    const flag: Flag = { ...data, id, createdAt: now, updatedAt: now };
    setFlags(prev => ({ ...prev, [id]: flag }));
    saveFlag(flag);
    return flag;
  };

  const updateFlag = (id: string, updates: Partial<Pick<Flag, 'name' | 'description'>>) => {
    let updated: Flag | null = null;
    setFlags(prev => {
      if (!prev[id]) return prev;
      updated = { ...prev[id], ...updates, updatedAt: new Date().toISOString() };
      return { ...prev, [id]: updated };
    });
    if (updated) saveFlag(updated);
    return updated;
  };

  const deleteFlag = (id: string) => {
    setFlags(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    removeFlagApi(id);
  };

  const getAllFlags = React.useCallback(() => {
    if (ready && !fetchedFor.has(userId)) {
      fetchedFor.add(userId);
      fetchFlags().then(result => {
        if (!result) {
          fetchedFor.delete(userId);
          return;
        }
        if (!result.flags.length) return;
        setFlags(prev => {
          const merged = { ...prev };
          let changed = false;
          for (const flag of result.flags) {
            const existing = merged[flag.id];
            if (!existing || new Date(flag.updatedAt) > new Date(existing.updatedAt)) {
              merged[flag.id] = flag;
              changed = true;
            }
          }
          return changed ? merged : prev;
        });
      });
    }
    return Object.values(flags).sort((a, b) => a.name.localeCompare(b.name));
  }, [flags, userId, ready, setFlags]);

  const getFlag = (id: string) => flags[id];

  return {
    addFlag,
    updateFlag,
    deleteFlag,
    getAllFlags,
    getFlag,
  };
};
