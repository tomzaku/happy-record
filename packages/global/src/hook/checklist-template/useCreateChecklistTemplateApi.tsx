// Publishes a checklist template as shareable — the write side of
// `/checklist-template/shared/:id`. See CLAUDE.md and
// useGetChecklistTemplateApi.tsx (the read side).
//
// A public template alone isn't enough: its fieldGroups reference field ids
// that only resolve for the recipient if those fields are public too (RLS's
// "owner OR visibility = 'public'" read rule applies to `fields` the same as
// `checklist_templates`). So sharing flips visibility on both, through the
// same edge functions every other write in this app goes through — no
// separate "share" backend, no random doc id; the shared link is just the
// template's own id.
import { saveChecklistTemplate } from '../../store/checklists/checklistTemplatesApi';
import { saveRecordField } from '../../store/record-field/recordFieldApi';
import type { ChecklistTemplate } from '../../store/checklists/useChecklistTemplates';
import type { RecordField } from '../../store/record-field/useRecordField';

export const useCreateChecklistTemplate = () => {
  const updateChecklistTemplate = async (data: {
    checklistTemplate: ChecklistTemplate;
    fields: (RecordField | undefined)[];
  }) => {
    await saveChecklistTemplate(data.checklistTemplate);
    await Promise.all(
      data.fields
        .filter((field): field is RecordField => !!field && field.visibility !== 'public')
        .map(field => saveRecordField({ ...field, visibility: 'public' })),
    );
    return { id: data.checklistTemplate.id };
  };
  return {
    updateChecklistTemplate,
  };
};
