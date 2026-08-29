// Reads a shared checklist template — the `/checklist-template/shared/:id`
// page's data source. See CLAUDE.md and useCreateChecklistTemplateApi.tsx
// (the write side that makes the template, and its fields, public first).
import { fetchChecklistTemplateById } from '../../store/checklists/checklistTemplatesApi';
import { fetchFieldGroups } from '../../store/checklists/fieldGroupsApi';
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

    // `fetchChecklistTemplateById` calls the edge function directly, bypassing
    // useChecklistTemplates' own store/merge — `checklistTemplate.fieldGroups` never comes back
    // from that response anymore (see 20260829010000_notes_note_id_ownership.sql), so this has
    // to fetch it itself instead of assuming it's already populated.
    const fieldGroupsResult = await fetchFieldGroups({ checklistTemplateId: checklistTemplate.id });
    const fieldIds = (fieldGroupsResult?.fieldGroups ?? []).flatMap(group =>
      group.fields.map(f => f.fieldId),
    );
    const fieldsResult = await fetchRecordFieldsByIds(fieldIds);
    return {
      checklistTemplate: { ...checklistTemplate, fieldGroups: fieldGroupsResult?.fieldGroups ?? [] },
      fields: fieldsResult?.fields ?? [],
    };
  };
  return {
    getChecklistTemplateApi,
  };
};
