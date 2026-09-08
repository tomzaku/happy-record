import React from 'react';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import { occursOnDate } from '../../utils/rruleUtils';
import { useFieldGroups } from './useFieldGroups';
import { useChecklistTemplatesQuery } from './useChecklistTemplatesQuery';
import { useChecklistTemplateMutations } from './useChecklistTemplateMutations';
import type { ChecklistTemplate } from './checklistTemplateTypes';
import { getActiveFieldGroups } from './fieldGroupTypes';

export type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';
export * from './fieldGroupTypes';
export { useChecklistTemplateDetail } from './useChecklistTemplateDetail';

// Not scheduled once deleted, regardless of what its own repeat says. The day-of-week itself is
// derived from field-group schedules when there are any — never the template's own stored
// `repeat.byday`, which is only a display convenience and can be stale — combined with the
// template's own `startedAt`/`until`/`interval`/`count` (groups don't carry those, so the
// template's own is the only sensible source). `occursOnDate` already respects `startedAt`
// (DTSTART) and `until` (UNTIL) natively, so there's no separate window pre-check needed here
// anymore.
function isTemplateScheduledOnDate(template: ChecklistTemplate | undefined, date: Date): boolean {
  if (!template || template.deletedAt) return false;
  const effectiveByday = getEffectiveDayOfWeek(template);
  const hasActiveFieldGroups = getActiveFieldGroups(template.fieldGroups ?? []).length > 0;
  return occursOnDate(
    {
      ...template.repeat,
      byday: effectiveByday,
      // A field-group-driven template's real schedule lives on each active group's own `repeat`
      // (that's exactly what `effectiveByday` already merges in above) — a top-level
      // `repeat.recurring: false` (e.g. left over from before groups existed, or set by the
      // Start/End Date dialog for its own, unrelated reason — see that dialog's own comment) must
      // not short-circuit this into "every day in the date range" instead of respecting each
      // group's actual days.
      ...(hasActiveFieldGroups ? { recurring: true } : {}),
    },
    date,
  );
}

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
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
    isOwnedTemplate,
  };
};
