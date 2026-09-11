import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { getHasQuickSubmit } from './checklistDayHelpers';

type Params = {
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  date: Date;
  pendingIds: string[];
  completedIds: string[];
};

// Drives both a single row's own expand/collapse toggle (ChecklistDayRow's chevron) and a
// section's "expand/collapse all" button (ChecklistDayTaskList's own chevron, next to Pending/
// Completed) from one shared piece of state — pulled into its own hook to keep
// ChecklistDay.desktop.tsx under the repo's ~200-line-per-file guideline (CLAUDE.md's "Keep every
// file under ~200 lines").
export const useFieldGroupExpansion = ({ checklist, checklistTemplate, date, pendingIds, completedIds }: Params) => {
  // A row's own field-group area starts expanded (see ChecklistDayRowSubmit) — this only ever
  // holds the ids a viewer explicitly collapsed, so a section's "expand/collapse all" button can
  // flip every row it affects without needing an entry for every expandable row up front.
  const [collapsedFieldGroupIds, setCollapsedFieldGroupIds] = React.useState<Set<string>>(new Set());

  const toggleFieldGroupExpanded = React.useCallback((id: string) => {
    setCollapsedFieldGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const getRowHasQuickSubmit = React.useCallback(
    (id: string) => getHasQuickSubmit(checklistTemplate[checklist[id]?.checklistTemplateId ?? ''], date),
    [checklist, checklistTemplate, date],
  );

  const pendingExpandableIds = React.useMemo(
    () => pendingIds.filter(getRowHasQuickSubmit),
    [pendingIds, getRowHasQuickSubmit],
  );
  const completedExpandableIds = React.useMemo(
    () => completedIds.filter(getRowHasQuickSubmit),
    [completedIds, getRowHasQuickSubmit],
  );

  // Same "every id here is currently expanded" read the button's own icon direction reflects —
  // vacuously true with no expandable ids, but the button never renders in that case anyway.
  const isSectionExpanded = React.useCallback(
    (ids: string[]) => ids.every(id => !collapsedFieldGroupIds.has(id)),
    [collapsedFieldGroupIds],
  );

  const toggleSectionExpanded = React.useCallback((ids: string[]) => {
    setCollapsedFieldGroupIds(prev => {
      const expandedNow = ids.every(id => !prev.has(id));
      const next = new Set(prev);
      ids.forEach(id => {
        if (expandedNow) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  }, []);

  return {
    collapsedFieldGroupIds,
    toggleFieldGroupExpanded,
    pendingExpandableIds,
    completedExpandableIds,
    isSectionExpanded,
    toggleSectionExpanded,
  };
};
