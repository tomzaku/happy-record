import { useChecklist, useChecklistTemplates } from '@dreamer/global';
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

  // If no weekly hobbies are selected, it's a forever task (no repeat schedule)
  const repeat = weeklyHobbies && weeklyHobbies.length > 0
    ? calculateRepeat({ weeklyHobbies, selectedTime, startedAt })
    : undefined;

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

  // If not repeat we need to create a checklist onetime. `checklists.checklist_template_id` is a
  // real FK into `checklist_templates` — firing this immediately (id in hand, but the template's
  // own POST above still in flight) races that insert and can 500 with a foreign-key violation
  // if this one lands first. `saved` is exactly the guard useJoinChallenge.tsx's own comment
  // describes for this same race.
  if (!repeat) {
    await saved;
    addChecklist({
      title: checklistText,
      checklistTemplateId: id,
      startedAt,
      endedAt: new Date('2099-12-31T23:59:59.999Z').toISOString(), // Far future date for forever tasks
    });
  }

  return { id };
};
