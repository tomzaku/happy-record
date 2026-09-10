import React from 'react';
import {
  useChecklist,
  useChecklistTemplates,
  useSyncedSelector,
  checklistInstanceId,
  occurrenceSeed,
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
  const {
    checklistTemplate,
    withFieldGroups,
    updateChecklistTemplate,
    splitChecklistTemplate,
    updateMyReminder,
    modifyOccurrence,
    isOwnedTemplate,
  } = useChecklistTemplates();
  const { getChecklistDetail, addChecklist, updateChecklist } = useChecklist();
  const { getAllRecordFields, getRecordFieldsByTemplateId } = useRecordField();

  const rawTemplate = data ? checklistTemplate[data.checklistTemplateId] : undefined;
  // `withFieldGroups` always returns a brand-new spread object (see useChecklistTemplates.tsx's
  // own definition) — calling it unmemoized here made `template` a new reference every render
  // regardless of whether `rawTemplate` actually changed, which cascaded into every memo below it
  // (`activeGroups` → `relevantGroups` → `fieldsByGroup`) recomputing every render too, and fed
  // ChecklistFieldGroupAdd a new `fields` array every render — refiring its own reload effect
  // forever. Every other derived value here is already memoed against real inputs; this one
  // wasn't.
  const template = React.useMemo(
    () => (rawTemplate ? withFieldGroups(rawTemplate) : undefined),
    [rawTemplate, withFieldGroups],
  );

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
      ...occurrenceSeed(template, data.date),
    });
  }, [data, template, relevantGroups.length, checklist, addChecklist, deterministicId]);

  const markCompleted = () => {
    if (!checklist) return;
    updateChecklist({ id: checklist.id, completedAt: new Date().toISOString() });
  };

  // Calendar-only, affects the whole series (TaskColorPicker) — `undefined` clears back to the
  // automatic avatar-or-hash color. Sent as `null`, not `undefined`: `updateChecklistTemplate`'s
  // own diff only includes a key when it actually changed, but `JSON.stringify` — the wire
  // serializer, see packages/global/src/lib/api.ts's `send()` — drops any top-level key whose
  // value is `undefined` entirely, so a clear-to-automatic would silently never reach the server.
  // `null` is a real JSON value and survives; the server DTO already treats anything that isn't a
  // known palette string as "clear to null" (checklist-templates-dto.ts's `patchChecklistTemplate`).
  const setCalendarColor = (color: string | undefined) => {
    if (!template) return;
    updateChecklistTemplate({ ...template, calendarColor: (color ?? null) as unknown as string | undefined });
  };

  return {
    template,
    relevantGroups,
    fieldsByGroup,
    checklist,
    markCompleted,
    setCalendarColor,
    updateChecklistTemplate,
    updateChecklist,
    splitChecklistTemplate,
    updateMyReminder,
    modifyOccurrence,
    // Whether *this device* owns the template, not just whether it's synced locally — a joined
    // challenge's template lands in the same `checklistTemplate` map (see withFieldGroups above),
    // so this is what tells "my own task" from "one I joined" for the Schedule vs. My Reminder
    // choice below (same check detail-task-page's own index.desktop.tsx/index.mobile.tsx make via
    // `!challenge || challenge.ownerId === userId` — this modal has no `challenge` object in scope,
    // so `isOwnedTemplate` is the simpler equivalent).
    isOwnedTemplate,
  };
};
