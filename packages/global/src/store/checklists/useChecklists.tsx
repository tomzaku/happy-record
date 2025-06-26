import React from 'react';
import { useLocalStorage } from '../../hook';
import { useChecklistTemplates } from './useChecklistTemplates';
import { v4 } from 'uuid';

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
    ({ date }: { date: Date } = { date: new Date() }) => {
      const checklistsByGivingDate = Object.values(checklist).filter(
        currentChecklist =>
          new Date(currentChecklist.startedAt).toLocaleDateString() ===
          date.toLocaleDateString(),
      );
      const checklistTemplatesByGivingDateIds =
        getChecklistTemplateIdsByGivingDate({
          date,
        });
      const checklists: Checklist[] = checklistTemplatesByGivingDateIds.map(
        id => {
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
        },
      );
      return {
        checklistIds: checklists.map(checklist => checklist.id),
        checklist: checklists.reduce(
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
    ({ date }: { date: Date }) => {
      const { checklistIds, checklist } = getRepeatChecklistByGivingDate({
        date,
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
