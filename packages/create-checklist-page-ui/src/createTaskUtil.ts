import { useChecklist, useChecklistTemplates, getClientTimezone } from '@dreamer/global';
import { calculateRepeat } from './calculateRepeat';
import { FormState } from './CoreChecklistForm';

/**
 * Utility function to handle task creation logic
 * Follows the desktop logic from create-task-modal
 */
export const createTask = async (
  formData: FormState,
  addChecklistTemplate: ReturnType<typeof useChecklistTemplates>['addChecklistTemplate'],
  addChecklist: ReturnType<typeof useChecklist>['addChecklist']
) => {
  const {
    startedAt,
    selectedTime,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    weeklyHobbies,
    fieldGroups,
    tags,
  } = formData;

  // CreateChecklistForm's own initialValues already defaults this to today, but a cleared date
  // input (DatePicker's own onChange can hand back '') would otherwise reach here as an empty
  // string — Checklist.startedAt isn't optional, and calculateRepeat only defaults its own
  // startedAt on the *repeat* branch below, never on the one-off `addChecklist` branch further
  // down. Defaulting here, once, guarantees every write below always sends an explicit date
  // rather than leaning on a nested default that doesn't cover both branches.
  //
  // `startedAt` itself always arrives as a full ISO instant already — every producer of
  // `FormState.startedAt` (CreateChecklistForm/create-task-modal's "today" default,
  // AddInlineTask's own selected-date default, SchedulingGroup's DatePicker onChange) converts a
  // bare `yyyy-MM-dd` to ISO the moment it's picked (see @dreamer/global's
  // `localDateStringToISO`), so there's nothing left to convert here.
  const effectiveStartedAt = startedAt || new Date().toISOString();

  // "No weekly hobbies selected" is still what makes this a forever task (a one-off Checklist row
  // below, not a recurring template) — that decision stays on `weeklyHobbies.length`, not on
  // whether `repeat` itself is set.
  const isRecurring = !!weeklyHobbies && weeklyHobbies.length > 0;

  // Every new template gets a `repeats` row from the moment it's created now, even a forever one
  // — otherwise `checklist-templates` never saw a `startedAt` at all for that shape, only the
  // one-off `checklists` row below did (see ChecklistGenericInfo's own Start Date row, which
  // reads this same field). `dayOfWeek: ''` here reads as "not scheduled" everywhere that already
  // checks it (getEffectiveDayOfWeek/getChecklistTemplateIdsByGivingDate), same as `repeat` being
  // `undefined` used to — so this still never counts as a recurring schedule.
  const repeat = isRecurring
    ? calculateRepeat({ weeklyHobbies, selectedTime, startedAt: effectiveStartedAt })
    : {
        startedAt: effectiveStartedAt,
        hour: '',
        minute: '',
        dayOfMonth: '',
        month: '',
        dayOfWeek: '',
        timezone: getClientTimezone(),
      };

  const { id, saved } = addChecklistTemplate({
    title: checklistText,
    repeat,
    avatar: {
      type: 'icon',
      name: selectedIcon,
      color: selectedColor,
    },
    records: selectedRecords || [], // Default empty array since RecordTaskSetting is commented out
    fieldGroups: fieldGroups || [], // Default empty array since RecordTaskSetting is commented out
    tags,
  });

  // Forever task → also create a one-off Checklist row. `checklists.checklist_template_id` is a
  // real FK into `checklist_templates` — firing this immediately (id in hand, but the template's
  // own POST above still in flight) races that insert and can 500 with a foreign-key violation
  // if this one lands first. `saved` is exactly the guard useJoinChallenge.tsx's own comment
  // describes for this same race.
  if (!isRecurring) {
    await saved;
    addChecklist({
      title: checklistText,
      checklistTemplateId: id,
      startedAt: effectiveStartedAt,
      endedAt: new Date('2099-12-31T23:59:59.999Z').toISOString(), // Far future date for forever tasks
    });
  }

  return { id };
};
