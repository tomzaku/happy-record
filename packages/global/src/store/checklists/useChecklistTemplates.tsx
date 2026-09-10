import React from 'react';
import { useChecklistTemplatesQuery } from './useChecklistTemplatesQuery';
import { useChecklistTemplateMutations } from './useChecklistTemplateMutations';
import { isTemplateScheduledOnDate, listTemplateOccurrences } from './templateOccurrences';
import type { ChecklistTemplate } from './checklistTemplateTypes';

export type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';
export * from './fieldGroupTypes';
export { useChecklistTemplateDetail } from './useChecklistTemplateDetail';

/**
 * Composes the read side (useChecklistTemplatesQuery) and write side
 * (useChecklistTemplateMutations) into the one public hook every consumer actually calls, and
 * adds the schedule-matching read functions the home page's calendar uses. `fieldGroups` is a
 * real column on the wire again (see checklist-templates-dto.ts's own header comment) — every
 * `checklistTemplate[id]` already carries its real, current groups, so there's no merge step
 * here anymore (there used to be one, `withFieldGroups`, back when it was its own resource fetched
 * separately; see git history if you need the old shape).
 */
export const useChecklistTemplates = () => {
  const {
    userId,
    queryClient,
    allKey,
    checklistTemplate,
    templatesLoading,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    isOwnedTemplate,
    markTemplateIdKnown,
  } = useChecklistTemplatesQuery();
  const {
    addChecklistTemplate,
    updateChecklistTemplate,
    splitChecklistTemplate,
    deleteChecklistTemplate,
    updateMyReminder,
    deleteOccurrence,
    restoreOccurrence,
    modifyOccurrence,
  } = useChecklistTemplateMutations({
    userId,
    queryClient,
    allKey,
    checklistTemplate,
    markTemplateIdKnown,
    selectChecklistTemplate,
    deselectChecklistTemplate,
  });

  const getRecommendChecklistTemplates = React.useCallback(
    (): ChecklistTemplate[] => Object.values(checklistTemplate),
    [checklistTemplate],
  );

  const getChecklistTemplateIdsByGivingDate = React.useCallback(
    ({ date }: { date: Date } = { date: new Date() }) =>
      selectedChecklistTemplates.filter(id => isTemplateScheduledOnDate(checklistTemplate[id], date)),
    [selectedChecklistTemplates, checklistTemplate],
  );

  // Range form of the same day-matching — useCalendarEvents.ts's own event generation, one
  // `list()` call per template instead of testing every day against every template.
  const getTemplateOccurrencesInRange = React.useCallback(
    (id: string, from: Date, to: Date): Date[] => listTemplateOccurrences(checklistTemplate[id], from, to),
    [checklistTemplate],
  );

  return {
    checklistTemplate,
    templatesLoading,
    addChecklistTemplate,
    updateChecklistTemplate,
    splitChecklistTemplate,
    deleteChecklistTemplate,
    updateMyReminder,
    deleteOccurrence,
    restoreOccurrence,
    modifyOccurrence,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
    getTemplateOccurrencesInRange,
    isOwnedTemplate,
  };
};
