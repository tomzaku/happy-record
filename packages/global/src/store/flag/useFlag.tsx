import React from 'react';
import { useLocalStorage } from '../../hook';
import { v4 } from 'uuid';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
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

// One flag(!) for the whole page load — see the same guard in useRecordField.tsx.
let flagsSynced = false;

export const useFlag = () => {
  const [flags, setFlags] = useLocalStorage<Record<string, Flag>>(FLAG_KEY, {});

  React.useEffect(() => {
    if (flagsSynced) return;
    flagsSynced = true;
    fetchFlags().then(result => {
      if (!result) {
        flagsSynced = false;
        return;
      }
      // Only fills in flags this device doesn't already have — an
      // unsynced local edit always wins over a stale server copy.
      setFlags(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const flag of result.flags) {
          if (!merged[flag.id]) {
            merged[flag.id] = flag;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    });
  }, []);

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

  const getAllFlags = () => {
    return Object.values(flags).sort((a, b) => a.name.localeCompare(b.name));
  };

  const getFlag = (id: string) => flags[id];

  return {
    addFlag,
    updateFlag,
    deleteFlag,
    getAllFlags,
    getFlag,
  };
};
