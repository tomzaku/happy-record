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
};

export const useChecklist = () => {
  const [checklist, setChecklist] = useLocalStorage<Record<string, Checklist>>(
    CHECKLIST_KEY,
    {}
  );
  const { getChecklistTemplateIdsByGivingDate, checklistTemplate } =
    useChecklistTemplates();

  const [checklistByGivingDateIds, setChecklistTodayIds] = React.useState<
    string[]
  >([]);
  const [tempChecklist, setTempChecklist] = React.useState<
    Record<string, Checklist>
  >({});

  const getRepeatChecklistByGivingDate = (
    { date }: { date: Date } = { date: new Date() }
  ) => {
    const checklistsToday = Object.values(checklist).filter(
      currentChecklist =>
        new Date(currentChecklist.startedAt).toLocaleDateString() ===
        date.toLocaleDateString()
    );
    const checklistsTodayTemplateIds = checklistsToday.map(
      c => c.checklistTemplateId
    );
    const checklistTemplatesTodayIds = getChecklistTemplateIdsByGivingDate({
      date,
    }).filter(i => !checklistsTodayTemplateIds.includes(i));
    const checklists: Checklist[] = [
      ...checklistsToday,
      ...checklistTemplatesTodayIds.map(id => ({
        id: v4(),
        title: checklistTemplate[id].title,
        checklistTemplateId: id,
        startedAt: new Date().toISOString(),
        endedAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
      })),
    ];
    return {
      checklistIds: checklists.map(checklist => checklist.id),
      checklist: checklists.reduce(
        (acc: Record<string, Checklist>, checklist: Checklist) => ({
          ...acc,
          [checklist.id]: checklist,
        }),
        {}
      ),
    };
  };

  const updateChecklist = (checklistToUpdate: Checklist) => {
    setChecklist({
      ...checklist,
      [checklistToUpdate.id]: checklistToUpdate,
    });
  };
  const addChecklist = (checklistToAdd: Omit<Checklist, 'id'>) => {
    const id = v4();
    setChecklist({
      ...checklist,
      [id]: {
        ...checklistToAdd,
        id,
      },
    });
  };

  const getChecklistByGivingDate = ({ date }: { date: Date }) => {
    const { checklistIds, checklist } = getRepeatChecklistByGivingDate({
      date,
    });
    setChecklistTodayIds(checklistIds);
    setTempChecklist(checklist);
  };

  return {
    updateChecklist,
    getChecklistByGivingDate,
    allChecklist: {
      ...tempChecklist,
      ...checklist,
    },
    addChecklist,
    checklistByGivingDateIds,
  };
};
