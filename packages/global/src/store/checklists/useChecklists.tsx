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

  const [checklistByGivingDateIds, setChecklistByGivingDateIds] =
    React.useState<string[]>([]);
  const [tempChecklist, setTempChecklist] = React.useState<
    Record<string, Checklist>
  >({});

  const getRepeatChecklistByGivingDate = (
    { date }: { date: Date } = { date: new Date() },
  ) => {
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
            endedAt: new Date(
              new Date().setHours(23, 59, 59, 999),
            ).toISOString(),
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
  };

  const updateChecklist = (checklistToUpdate: Checklist) => {
    setChecklist({
      ...checklist,
      [checklistToUpdate.id]: checklistToUpdate,
    });
  };
  const addChecklist = (checklistToAdd: Omit<Checklist, 'id'>) => {
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
  };

  const getChecklistByGivingDate = ({ date }: { date: Date }) => {
    const { checklistIds, checklist } = getRepeatChecklistByGivingDate({
      date,
    });
    setChecklistByGivingDateIds(checklistIds);
    setTempChecklist(checklist);
  };

  const getAllChecklistWithTemplate = (checklistTemplateId: string) => {
    return Object.values(checklist)
      .filter(
        checklist => checklist.checklistTemplateId === checklistTemplateId,
      )
      .sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
  };
  const getChecklistDetail = (id: string) => checklist[id];

  return {
    updateChecklist,
    getChecklistByGivingDate,
    getAllChecklistWithTemplate,
    allChecklist: {
      ...tempChecklist,
      ...checklist,
    },
    addChecklist,
    checklistByGivingDateIds,
    getChecklistDetail,
  };
};
