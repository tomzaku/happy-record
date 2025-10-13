import React from 'react';
import { useLocalStorage } from '../../hook';
import { useChecklistTemplates } from './useChecklistTemplates';
import { v4 } from 'uuid';
import { startOfDay, endOfDay } from 'date-fns';

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

export const useChecklist = () => {
  const [checklist, setChecklist] = useLocalStorage<Record<string, Checklist>>(
    CHECKLIST_KEY,
    {},
  );
  const { getChecklistTemplateIdsByGivingDate, checklistTemplate } =
    useChecklistTemplates();

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

        // A checklist is considered forever if the template has no repeat schedule
        const hasSchedule =
          template?.repeat?.dayOfWeek &&
          template.repeat.dayOfWeek.trim() !== '';
        if(hasSchedule) return false;
        if (existingChecklist.completedAt) {
          const completedAtDate = new Date(existingChecklist.completedAt);
          return completedAtDate >= startOfDay(date);
        }

          // Must be on or after the startedAt date
          const startedAtDate = new Date(existingChecklist.startedAt);
          return startedAtDate <= endOfDay(date);
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
      setChecklist({
        ...checklist,
        [checklistToUpdate.id]: {
          ...checklist[checklistToUpdate.id],
          ...checklistToUpdate,
        },
      });
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
