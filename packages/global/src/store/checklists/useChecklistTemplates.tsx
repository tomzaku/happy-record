import React from 'react';
import { useFieldGroups } from './useFieldGroups';
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
 * adds the pieces that need both: merging in field groups, and the schedule-matching read
 * functions the home page's calendar uses.
 */
export const useChecklistTemplates = () => {
  const { getFieldGroups } = useFieldGroups();
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

  // `field-groups` isn't a column on this row anymore — every read function below merges
  // `getFieldGroups(id)` onto the object it returns.
  const withFieldGroups = React.useCallback(
    (template: ChecklistTemplate): ChecklistTemplate => ({
      ...template,
      fieldGroups: getFieldGroups(template.id, isOwnedTemplate(template.id)),
    }),
    [getFieldGroups, isOwnedTemplate],
  );

  const getRecommendChecklistTemplates = React.useCallback(
    (): ChecklistTemplate[] => Object.values(checklistTemplate).map(withFieldGroups),
    [checklistTemplate, withFieldGroups],
  );

  const getChecklistTemplateIdsByGivingDate = React.useCallback(
    ({ date }: { date: Date } = { date: new Date() }) =>
      selectedChecklistTemplates.filter(id => {
        const raw = checklistTemplate[id];
        return isTemplateScheduledOnDate(raw && withFieldGroups(raw), date);
      }),
    [selectedChecklistTemplates, checklistTemplate, withFieldGroups],
  );

  // Range form of the same day-matching — useCalendarEvents.ts's own event generation, one
  // `list()` call per template instead of testing every day against every template.
  const getTemplateOccurrencesInRange = React.useCallback(
    (id: string, from: Date, to: Date): Date[] => {
      const raw = checklistTemplate[id];
      return listTemplateOccurrences(raw && withFieldGroups(raw), from, to);
    },
    [checklistTemplate, withFieldGroups],
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
    // Exposed for callers that look up one template at a time from the raw `checklistTemplate`
    // map and need its real `fieldGroups` (useCalendarEvents.ts's own per-day event builder) —
    // mapping every template via getRecommendChecklistTemplates would be wasteful there.
    withFieldGroups,
  };
};
