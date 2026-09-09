import React from 'react';
import { startOfDay } from 'date-fns';
import {
  useChecklist,
  useChecklistTemplates,
  useSyncedSelector,
  checklistInstanceId,
  getActiveFieldGroups,
  getEffectiveFieldDisplay,
  isFieldGroupActiveOnDay,
  FieldGroup,
} from '@dreamer/global';
import { useRecordField, RecordField } from '@dreamer/global/src/store/record-field';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';

// The data wiring behind TaskDetailModal — split out so the component itself stays focused on
// layout (see CLAUDE.md's ~200-line-per-file guideline; this pairs with useDeleteTaskFlow.ts's
// own hook/component split in checklist-day).
export const useTaskDetailModalData = (data: CalendarEventData | undefined) => {
  const { checklistTemplate, withFieldGroups } = useChecklistTemplates();
  const { getChecklistDetail, addChecklist, updateChecklist } = useChecklist();
  const { getAllRecordFields, getRecordFieldsByTemplateId } = useRecordField();

  const rawTemplate = data ? checklistTemplate[data.checklistTemplateId] : undefined;
  const template = rawTemplate ? withFieldGroups(rawTemplate) : undefined;

  // `getRecordFieldsByTemplateId` guards on an empty templateId itself, safe to call
  // unconditionally even while the modal is closed (`data` undefined).
  useSyncedSelector(getRecordFieldsByTemplateId, data?.checklistTemplateId ?? '');
  const fields = useSyncedSelector(getAllRecordFields);

  const activeGroups = React.useMemo(() => getActiveFieldGroups(template?.fieldGroups ?? []), [template]);
  // Filtered to exactly this day, independent of `scheduleMode` — the real detail page (via
  // ChecklistFieldGroup) shows every active group regardless of whether it's actually due today,
  // sorting today's-scheduled ones to the top instead of hiding the rest; this quick-look modal
  // deliberately narrows further, to only what this specific calendar event is actually for, so a
  // multi-group template's other groups (Push showing on a Pull day, say) don't leak into a
  // one-day glance. A group with no `repeat.byday` of its own (or one covering every day) reads as
  // active every day either way — see isFieldGroupActiveOnDay's own doc comment.
  const relevantGroups = React.useMemo<FieldGroup[]>(() => {
    if (!data) return [];
    return activeGroups.filter(group => isFieldGroupActiveOnDay(group.repeat, data.date));
  }, [activeGroups, data]);

  // Same override-merge ChecklistFieldGroup itself does before handing a group's fields to its
  // own Add/History/Metric tabs — see that component's own `fieldDetailsByGroup`.
  const fieldsByGroup = React.useMemo(() => {
    const map: Record<string, RecordField[]> = {};
    for (const group of relevantGroups) {
      map[group.id] = group.fields
        .map(({ fieldId, overrides }) => {
          const field = fields.find(f => f.id === fieldId);
          return field ? getEffectiveFieldDisplay(field, overrides) : undefined;
        })
        .filter((field): field is RecordField => field !== undefined);
    }
    return map;
  }, [relevantGroups, fields]);

  // `ChecklistFieldGroupAdd` needs a real Checklist row to attach records to — same deterministic-
  // id upsert detail-task-page's own mount effect does (index.desktop.tsx), scoped here to only
  // fire once there's actually a field group to submit into. `addChecklist`'s identity churns on
  // every write to the checklist store (see index.desktop.tsx's own comment on issue #185), so
  // this needs the same "already creating this exact id" guard that effect uses, or a re-render
  // mid-flight re-fires it unboundedly.
  const deterministicId = data ? checklistInstanceId(data.checklistTemplateId, data.date) : undefined;
  const checklistId = data?.checklistId ?? deterministicId;
  const checklist = checklistId ? getChecklistDetail(checklistId) : undefined;
  const creatingIdRef = React.useRef<string>();
  React.useEffect(() => {
    if (!data || !template || relevantGroups.length === 0 || checklist) return;
    if (creatingIdRef.current === deterministicId) return;
    creatingIdRef.current = deterministicId;
    addChecklist({
      id: deterministicId,
      title: template.title,
      checklistTemplateId: data.checklistTemplateId,
      startedAt: startOfDay(data.date).toISOString(),
      durationDays: 1,
    });
  }, [data, template, relevantGroups.length, checklist, addChecklist, deterministicId]);

  const markCompleted = () => {
    if (!checklist) return;
    updateChecklist({ id: checklist.id, completedAt: new Date().toISOString() });
  };

  return { template, relevantGroups, fieldsByGroup, checklist, markCompleted };
};
