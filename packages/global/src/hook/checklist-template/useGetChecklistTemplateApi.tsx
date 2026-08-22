// Reads a shared checklist template — the `/checklist-template/shared/:id`
// page's data source. See CLAUDE.md and useCreateChecklistTemplateApi.tsx
// (the write side that makes the template, and its fields, public first).
import { fetchChecklistTemplateById } from '../../store/checklists/checklistTemplatesApi';
import { fetchRecordFieldsByIds } from '../../store/record-field/recordFieldApi';
import type { ChecklistTemplate } from '../../store/checklists/useChecklistTemplates';
import type { RecordField } from '../../store/record-field/useRecordField';

export const useGetChecklistTemplateApi = () => {
  const getChecklistTemplateApi = async (
    id: string,
  ): Promise<{ checklistTemplate: ChecklistTemplate; fields: RecordField[] } | null> => {
    const result = await fetchChecklistTemplateById(id);
    const checklistTemplate = result?.templates[0];
    // Not public, not this caller's own, or genuinely doesn't exist — RLS
    // and "no such id" look the same from here, on purpose.
    if (!checklistTemplate) return null;

    const fieldIds = checklistTemplate.fieldGroups.flatMap(group => group.fields);
    const fieldsResult = await fetchRecordFieldsByIds(fieldIds);
    return { checklistTemplate, fields: fieldsResult?.fields ?? [] };
  };
  return {
    getChecklistTemplateApi,
  };
};
