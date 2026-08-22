import React from 'react';
import { useLocalStorage } from '../../hook';
import { useChecklistTemplates } from './useChecklistTemplates';
import { v4 } from 'uuid';
import { startOfDay, endOfDay } from 'date-fns';

// Backend — see CLAUDE.md. Every call is quiet: a failure resolves to null
// and this hook's own useLocalStorage state is the fallback, unchanged.
import { fetchChecklists, saveChecklist } from './checklistsApi';

const CHECKLIST_KEY = 'checklist';

export type Checklist = {
  id: string;
  title: string;
  checklistTemplateId: string;
  completedAt?: string;
  startedAt: string;
  endedAt: string;
  clientOnly?: boolean;
};

// One flag for the whole page load — see the same guard in useRecordField.tsx.
let checklistsSynced = false;

export const useChecklist = () => {
  const [checklist, setChecklist] = useLocalStorage<Record<string, Checklist>>(
    CHECKLIST_KEY,
    {},
  );
  const { getChecklistTemplateIdsByGivingDate, checklistTemplate } =
    useChecklistTemplates();

  React.useEffect(() => {
    if (checklistsSynced) return;
    checklistsSynced = true;
    fetchChecklists().then(result => {
      if (!result) {
        checklistsSynced = false;
        return;
      }
      setChecklist(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const c of result.checklists) {
          if (!merged[c.id]) {
            merged[c.id] = c;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    });
  }, []);

  const getRepeatChecklistByGivingDate = React.useCallback(
    (
      { date, selectedTag }: { date: Date; selectedTag?: string } = {
        date: new Date(),
      },
    ) => {
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

      // Create checklists from scheduled templates
      const scheduledChecklists: Checklist[] =
        checklistTemplatesByGivingDateIds.map(id => {
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
    [checklist, getChecklistTemplateIdsByGivingDate, checklistTemplate],
  );

  const updateChecklist = React.useCallback(
    (checklistToUpdate: Partial<Checklist> & { id: Checklist['id'] }) => {
      const merged: Checklist = {
        ...checklist[checklistToUpdate.id],
        ...checklistToUpdate,
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
    (checklistToAdd: Omit<Checklist, 'id'>) => {
      const id = v4();
      const newChecklist = {
        ...checklistToAdd,
        id,
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

  const getAllChecklistWithTemplate = React.useCallback(
    (checklistTemplateId: string) => {
      return Object.values(checklist)
        .filter(
          checklist => checklist.checklistTemplateId === checklistTemplateId,
        )
        .sort(
          (a, b) =>
            new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
        );
    },
    [checklist],
  );

  const getChecklistDetail = React.useCallback(
    (id: string) => checklist[id],
    [checklist],
  );

  return {
    updateChecklist,
    getChecklistByGivingDate,
    getAllChecklistWithTemplate,
    addChecklist,
    getChecklistDetail,
  };
};
