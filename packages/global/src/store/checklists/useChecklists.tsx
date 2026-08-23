import React from 'react';
import { useSessionStore, useSession } from '../../hook';
import { useChecklistTemplates } from './useChecklistTemplates';
import { v4 } from 'uuid';
import { startOfDay, endOfDay } from 'date-fns';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { fetchChecklistById, fetchChecklists, removeChecklist, saveChecklist } from './checklistsApi';

const CHECKLIST_KEY = 'checklist';

export type Checklist = {
  id: string;
  title: string;
  checklistTemplateId: string;
  completedAt?: string;
  startedAt: string;
  endedAt: string;
  clientOnly?: boolean;
  updatedAt: string;
};

// Fetched by whatever scope is actually asked for — one day, one id, or one
// template's whole history — never "everything." Keyed so the same
// (identity, scope) tuple isn't re-fetched every call within a page load;
// `userId` is part of every key so a scope already fetched for one identity
// re-fetches once the signed-in identity actually changes.
const fetchedScopes = new Set<string>();

export const useChecklist = () => {
  const [checklist, setChecklist] = useSessionStore<Record<string, Checklist>>(CHECKLIST_KEY, {});
  const { userId, ready } = useSession();
  const { getChecklistTemplateIdsByGivingDate, checklistTemplate } =
    useChecklistTemplates();

  const mergeFetched = React.useCallback(
    (fetched: Checklist[]) => {
      if (!fetched.length) return;
      setChecklist(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const item of fetched) {
          const existing = merged[item.id];
          // Last-write-wins by `updatedAt` — cheap safety even though a
          // direct scoped fetch makes a real conflict rare.
          if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
            merged[item.id] = item;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    },
    [setChecklist],
  );

  const getRepeatChecklistByGivingDate = React.useCallback(
    (
      { date, selectedTag }: { date: Date; selectedTag?: string } = {
        date: new Date(),
      },
    ) => {
      // Background fetch for this exact day — merges into the store when it
      // lands, visible next time this day is read. A quiet `null` (offline,
      // no backend) just means "use what this device already has."
      const dayKey = JSON.stringify({ userId, day: date.toDateString() });
      if (ready && !fetchedScopes.has(dayKey)) {
        fetchedScopes.add(dayKey);
        fetchChecklists({
          from: startOfDay(date).toISOString(),
          to: endOfDay(date).toISOString(),
        }).then(result => {
          if (!result) {
            fetchedScopes.delete(dayKey);
            return;
          }
          mergeFetched(result.checklists);
        });
      }

      // Get existing checklists for the given date
      const checklistsByGivingDate = Object.values(checklist).filter(
        currentChecklist =>
          new Date(currentChecklist.startedAt).toLocaleDateString() ===
          date.toLocaleDateString(),
      );

      // Get scheduled checklist template IDs for the given date
      const checklistTemplatesByGivingDateIds =
        getChecklistTemplateIdsByGivingDate({
          date,
        });

      // Create checklists from scheduled templates. `checklistTemplate[id]`
      // can transiently be missing now that templates are fetched by scope
      // rather than all upfront — skip it this render rather than crash;
      // the template's own fetch resolving triggers this to recompute
      // (`checklistTemplate` is already in this callback's deps below).
      const scheduledChecklists: Checklist[] = checklistTemplatesByGivingDateIds
        .filter(id => checklistTemplate[id])
        .map(id => {
          const foundChecklist = checklistsByGivingDate.find(
            c => c.checklistTemplateId === id,
          );
          if (foundChecklist) {
            return foundChecklist;
          } else {
            return {
              id: v4(),
              clientOnly: true,
              title: checklistTemplate[id].title,
              checklistTemplateId: id,
              startedAt: new Date(date).toISOString(),
              endedAt: (() => {
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);
                return endDate.toISOString();
              })(),
              // Never synced or reconciled against — this is a throwaway
              // view, not yet a row this device has decided to persist
              // (see updateChecklist's comment on that first-edit moment).
              updatedAt: new Date(date).toISOString(),
            };
          }
        });

      const nonScheduledChecklists = Object.values(checklist).filter(
        existingChecklist => {
          const template =
          checklistTemplate[existingChecklist.checklistTemplateId];

        const hasSchedule =
          template?.repeat?.dayOfWeek &&
          template.repeat.dayOfWeek.trim() !== '';
        if(hasSchedule) return false;

        // A one-off (unscheduled) checklist belongs to exactly the day it
        // was started, not a range from there onward — and completedAt
        // being set shouldn't make it appear on every day back to the
        // beginning of time either. `completedAt` doesn't factor into
        // which day this shows on at all; it's just whether it's checked
        // off when it does.
        const startedAtDate = new Date(existingChecklist.startedAt);
        return startedAtDate >= startOfDay(date) && startedAtDate <= endOfDay(date);
        },
      );
      // Combine scheduled, non-scheduled, and forever checklists
      const allChecklists = [...scheduledChecklists, ...nonScheduledChecklists];

      // Filter by selected tag if provided
      let filteredChecklists = allChecklists;
      if (selectedTag && selectedTag !== 'all') {
        filteredChecklists = allChecklists.filter(checklist => {
          const template = checklistTemplate[checklist.checklistTemplateId];
          return template?.tags?.includes(selectedTag);
        });
      }

      return {
        checklistIds: filteredChecklists.map(checklist => checklist.id),
        checklist: filteredChecklists.reduce(
          (acc: Record<string, Checklist>, checklist: Checklist) => ({
            ...acc,
            [checklist.id]: checklist,
          }),
          {},
        ),
      };
    },
    [checklist, getChecklistTemplateIdsByGivingDate, checklistTemplate, userId, ready, mergeFetched],
  );

  const updateChecklist = React.useCallback(
    (checklistToUpdate: Partial<Checklist> & { id: Checklist['id'] }) => {
      const merged: Checklist = {
        ...checklist[checklistToUpdate.id],
        ...checklistToUpdate,
        // Every write bumps this — see CLAUDE.md's "every table gets
        // updated_at" convention. Set here, not left to the caller, so it
        // can never be forgotten at a call site.
        updatedAt: new Date().toISOString(),
      };
      setChecklist({
        ...checklist,
        [checklistToUpdate.id]: merged,
      });
      // `merged` may be a client-only instance's first real edit (see
      // getRepeatChecklistByGivingDate — the home page's checkbox updates
      // one of these directly) with no row on the server yet. `saveChecklist`
      // is an upsert, so that's exactly right: this call is what creates it.
      saveChecklist(merged);
    },
    [checklist, setChecklist],
  );

  const addChecklist = React.useCallback(
    (checklistToAdd: Omit<Checklist, 'id' | 'updatedAt'>) => {
      const id = v4();
      const newChecklist: Checklist = {
        ...checklistToAdd,
        id,
        updatedAt: new Date().toISOString(),
      };
      setChecklist({
        ...checklist,
        [id]: newChecklist,
      });
      saveChecklist(newChecklist);
      return newChecklist;
    },
    [checklist, setChecklist],
  );

  const getChecklistByGivingDate = React.useCallback(
    ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
      const { checklistIds, checklist } = getRepeatChecklistByGivingDate({
        date,
        selectedTag,
      });
      return {
        checklist,
        checklistIds,
      };
    },
    [getRepeatChecklistByGivingDate],
  );

  // Async and awaited (unlike the other read functions here) — its one
  // consumer (EditChecklistForm's "delete every instance of this template")
  // is a one-shot action that needs the real, complete list this tick, not
  // a render-time value that's fine to start incomplete and fill in later.
  // Builds the result from what's already cached plus the fresh response
  // directly, not by re-reading `checklist` after the await (that closure
  // is stale by the time `mergeFetched`'s `setChecklist` actually lands).
  const getAllChecklistWithTemplate = React.useCallback(
    async (checklistTemplateId: string): Promise<Checklist[]> => {
      const have: Record<string, Checklist> = {};
      for (const item of Object.values(checklist)) {
        if (item.checklistTemplateId === checklistTemplateId) have[item.id] = item;
      }
      if (ready) {
        const result = await fetchChecklists({ checklistTemplateId });
        if (result) {
          mergeFetched(result.checklists);
          for (const item of result.checklists) have[item.id] = item;
        }
      }
      return Object.values(have).sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );
    },
    [checklist, ready, mergeFetched],
  );

  const getChecklistDetail = React.useCallback(
    (id: string) => {
      const scopeKey = JSON.stringify({ userId, checklistId: id });
      if (ready && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchChecklistById(id).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeFetched(result.checklists);
        });
      }
      return checklist[id];
    },
    [checklist, userId, ready, mergeFetched],
  );

  const deleteChecklist = React.useCallback(
    (id: string) => {
      setChecklist(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      removeChecklist(id);
    },
    [setChecklist],
  );

  return {
    updateChecklist,
    getChecklistByGivingDate,
    getAllChecklistWithTemplate,
    addChecklist,
    getChecklistDetail,
    deleteChecklist,
  };
};
