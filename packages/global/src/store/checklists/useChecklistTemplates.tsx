import React from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import { useFieldGroups } from './useFieldGroups';
import { fetchOneTemplate } from './checklistTemplateFetch';
import { useChecklistTemplatesQuery } from './useChecklistTemplatesQuery';
import { useChecklistTemplateMutations } from './useChecklistTemplateMutations';
import type { ChecklistTemplate } from './checklistTemplateTypes';

export type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';
export * from './fieldGroupTypes';
export { useChecklistTemplateDetail } from './useChecklistTemplateDetail';

// Dedup for `getChecklistTemplate`'s own byId bypass fetch, below.
const fetchedByIdScopes = new Set<string>();

// Not scheduled once deleted, regardless of what its own repeat says. startedAt is when a
// schedule takes effect — a day-of-week match before it is history, not a day it was ever
// actually scheduled on; endedAt is the symmetric cutoff. The day-of-week itself is derived from
// field-group schedules when there are any — never the template's own stored `repeat.dayOfWeek`,
// which is only a display convenience and can be stale.
function isTemplateScheduledOnDate(template: ChecklistTemplate | undefined, date: Date): boolean {
  if (!template || template.deletedAt) return false;

  const startedAt = template.repeat?.startedAt;
  if (startedAt && date < startOfDay(new Date(startedAt))) return false;
  const endedAt = template.repeat?.endedAt;
  if (endedAt && date > endOfDay(new Date(endedAt))) return false;

  const effectiveDayOfWeek = getEffectiveDayOfWeek(template);
  return effectiveDayOfWeek?.split(',').includes(date.getDay().toString()) || effectiveDayOfWeek === '*';
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
    ready,
    queryClient,
    allKey,
    allTemplates,
    checklistTemplate,
    templatesLoading,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    isOwnedTemplate,
    mergeTemplates,
    markTemplateIdKnown,
  } = useChecklistTemplatesQuery();
  const { addChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, updateMyReminder } =
    useChecklistTemplateMutations({
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

  /** One template by id — own, or anyone's if public. Prefers "all mine"; falls back to a
   * one-off fetch otherwise (not yet fetched, or a joined template "all mine" never covers).
   * Routed through mergeTemplates so the id gets a real per-id query observer. */
  const getChecklistTemplate = React.useCallback(
    (id: string): ChecklistTemplate | undefined => {
      const scopeKey = `${userId}:${id}`;
      // A plain callback some callers invoke only once — not gated on the bulk fetch settling
      // (unlike useChecklistTemplatesQuery's own per-id queries), since that could mean never
      // fetching at all for those callers. One redundant request during the brief bulk-loading
      // race is an accepted trade-off: this only ever runs for one id at a time.
      if (ready && id && !allTemplates?.[id] && !fetchedByIdScopes.has(scopeKey)) {
        fetchedByIdScopes.add(scopeKey);
        fetchOneTemplate(id)
          .then(template => {
            if (!template) {
              fetchedByIdScopes.delete(scopeKey);
              return;
            }
            mergeTemplates([template]);
          })
          .catch(() => {
            fetchedByIdScopes.delete(scopeKey);
          });
      }
      const template = checklistTemplate[id];
      return template && withFieldGroups(template);
    },
    [checklistTemplate, userId, ready, allTemplates, mergeTemplates, withFieldGroups],
  );

  return {
    checklistTemplate,
    templatesLoading,
    getChecklistTemplate,
    addChecklistTemplate,
    updateChecklistTemplate,
    deleteChecklistTemplate,
    updateMyReminder,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
    isOwnedTemplate,
    // Exposed for the challenge join flow — merging a shared template under its own id, never
    // forking a new one.
    mergeTemplates,
  };
};
