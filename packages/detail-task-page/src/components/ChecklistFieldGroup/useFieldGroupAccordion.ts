import React from 'react';
import { FieldGroup, isFieldGroupActiveOnDay, useSyncedSelector } from '@dreamer/global';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { startOfDay, endOfDay } from 'date-fns';

type Params = {
  checklistTemplateId: string;
  currentDay: string;
  sortedGroups: FieldGroup[];
  fieldDetailsByGroup: Record<string, RecordField[]>;
};

// Which one sub-task (field group) card should be expanded by default — the current/next
// incomplete one, not each group's own static `collapseDefault` (that's still a real per-group
// setting, just no longer what picks the *initial* accordion state — see ChecklistFieldGroupMenu).
// "Incomplete" means "no record against any of this group's own fields today" — there's no real
// per-group completion flag in this data model (`Checklist.completedAt` is per checklist
// *instance*, i.e. per template per day, not per group), so this is a same-day record-presence
// check instead, the same shape ChecklistFieldMetric's own `todayCount` already uses per field,
// generalized here to a whole group's fields.
export const useFieldGroupAccordion = ({
  checklistTemplateId,
  currentDay,
  sortedGroups,
  fieldDetailsByGroup,
}: Params) => {
  const { getChecklistRecords } = useChecklistRecord();
  const day = React.useMemo(() => new Date(currentDay), [currentDay]);
  const todayRange = React.useMemo(
    () => ({ from: startOfDay(day).toISOString(), to: endOfDay(day).toISOString() }),
    [day],
  );
  const todaysRecordsByDate = useSyncedSelector(getChecklistRecords, checklistTemplateId, {
    rangeDate: todayRange,
    type: 'date' as const,
  });
  const todaysFieldIds = React.useMemo(
    () => new Set(Object.values(todaysRecordsByDate).flat().map(record => record.fieldId)),
    [todaysRecordsByDate],
  );

  const hasSubmittedToday = React.useCallback(
    (fieldGroup: FieldGroup) => (fieldDetailsByGroup[fieldGroup.id] ?? []).some(field => todaysFieldIds.has(field.id)),
    [fieldDetailsByGroup, todaysFieldIds],
  );

  const defaultExpandedId = React.useMemo(() => {
    const nextIncomplete = sortedGroups.find(
      group => isFieldGroupActiveOnDay(group.repeat, day) && !hasSubmittedToday(group),
    );
    if (nextIncomplete) return nextIncomplete.id;
    const firstActiveToday = sortedGroups.find(group => isFieldGroupActiveOnDay(group.repeat, day));
    return (firstActiveToday ?? sortedGroups[0])?.id;
  }, [sortedGroups, day, hasSubmittedToday]);

  // Only ever holds ids a viewer has explicitly clicked — everything else defers to
  // `defaultExpandedId` above, so a group's expanded state keeps tracking "is this the current
  // one" live (today's records arriving a beat after mount, the day changing) right up until the
  // moment someone actually overrides it by hand.
  const [collapsedOverrides, setCollapsedOverrides] = React.useState<Record<string, boolean>>({});

  const isCollapsed = React.useCallback(
    (fieldGroupId: string) => collapsedOverrides[fieldGroupId] ?? fieldGroupId !== defaultExpandedId,
    [collapsedOverrides, defaultExpandedId],
  );

  const toggleCollapse = (fieldGroupId: string) => {
    setCollapsedOverrides(prev => ({ ...prev, [fieldGroupId]: !isCollapsed(fieldGroupId) }));
  };

  return { isCollapsed, toggleCollapse, hasSubmittedToday };
};
