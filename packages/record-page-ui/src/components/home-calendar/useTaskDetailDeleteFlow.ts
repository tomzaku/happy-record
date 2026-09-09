import React from 'react';
import { useChecklist, useChecklistTemplates, checklistInstanceId } from '@dreamer/global';
import { useDeleteTaskFlow } from '../checklist-day/useDeleteTaskFlow';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';

// Reuses checklist-day's own useDeleteTaskFlow verbatim — same This event / This and following /
// All events scope mechanics (schedule_exceptions + template `until` + template delete), fed this
// modal's single selected event's date instead of a row list's `date`. `checklist` here is the
// same day-scoped, synthesized map ChecklistDay itself passes in (via getChecklistByGivingDate,
// both rooted in computeChecklistsForDate) rather than the raw store record — a plain task with no
// materialized row yet still resolves to its deterministic clientOnly instance this way, same as
// every ChecklistDay row does; the raw store alone wouldn't have it until a submit created one.
export const useTaskDetailDeleteFlow = (data: CalendarEventData | undefined) => {
  const { getChecklistForDateWithoutFetching, deleteChecklist, getAllChecklistWithTemplate } = useChecklist();
  const { checklistTemplate, deleteChecklistTemplate, updateChecklistTemplate, deleteOccurrence } =
    useChecklistTemplates();

  const date = data?.date ?? new Date();
  const { checklist } = React.useMemo(
    () => getChecklistForDateWithoutFetching({ date }),
    [getChecklistForDateWithoutFetching, date],
  );
  const eventChecklistId = data ? data.checklistId ?? checklistInstanceId(data.checklistTemplateId, date) : undefined;

  const deleteFlow = useDeleteTaskFlow({
    date,
    checklist,
    checklistTemplate,
    deleteChecklist,
    getAllChecklistWithTemplate,
    deleteChecklistTemplate,
    updateChecklistTemplate,
    deleteOccurrence,
    setHoveredTaskId: () => {},
    setFocusedTaskId: () => {},
  });

  return { ...deleteFlow, eventChecklistId };
};
