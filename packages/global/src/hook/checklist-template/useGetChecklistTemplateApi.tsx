// Reads a shared checklist template — the `/checklist-template/shared/:id`
// page's data source. See CLAUDE.md and useCreateChecklistTemplateApi.tsx
// (the write side that makes the template itself public).
import { fetchChecklistTemplateById } from '../../store/checklists/checklistTemplatesApi';
import { fetchFieldGroups } from '../../store/checklists/fieldGroupsApi';
import { fetchRecordFieldsByTemplateId } from '../../store/record-field/recordFieldApi';
import type { ChecklistTemplate, FieldGroup } from '../../store/checklists/useChecklistTemplates';
import type { RecordField } from '../../store/record-field/useRecordField';

export const useGetChecklistTemplateApi = () => {
  // Split out of the combined fetch below so a caller that wants to render as soon as the
  // template itself is in (the shared-template page's own headline/card) doesn't have to wait
  // on fields/fieldGroups too — see useChecklistTemplateSharedPage.ts.
  const getChecklistTemplateOnly = async (id: string): Promise<ChecklistTemplate | null> => {
    const result = await fetchChecklistTemplateById(id);
    // Not public, not this caller's own, or genuinely doesn't exist — RLS
    // and "no such id" look the same from here, on purpose.
    return result?.templates[0] ?? null;
  };

  /**
   * `fetchChecklistTemplateById` calls the edge function directly, bypassing
   * useChecklistTemplates' own store/merge — `checklistTemplate.fieldGroups` never comes back
   * from that response anymore (see 20260829010000_notes_note_id_ownership.sql), so this has to
   * fetch it separately instead of assuming it's already populated. Fields are resolved by
   * template id, not by the referenced field ids directly — a shared template's own fields stay
   * `visibility: 'private'` now (see fields/index.ts's own listByTemplate), authorized by this
   * template being public rather than by the fields themselves. Neither depends on the other, so
   * they run in parallel rather than one after another.
   */
  const getFieldsAndGroups = async (
    checklistTemplateId: string,
  ): Promise<{ fields: RecordField[]; fieldGroups: FieldGroup[] }> => {
    const [fieldGroupsResult, fieldsResult] = await Promise.all([
      fetchFieldGroups({ checklistTemplateId }),
      fetchRecordFieldsByTemplateId(checklistTemplateId),
    ]);
    return {
      fields: fieldsResult?.fields ?? [],
      fieldGroups: fieldGroupsResult?.fieldGroups ?? [],
    };
  };

  /** The full, atomic read — useJoinChallenge's own need, which has to act on the complete
   * picture in one shot rather than rendering progressively. */
  const getChecklistTemplateApi = async (
    id: string,
  ): Promise<{ checklistTemplate: ChecklistTemplate; fields: RecordField[] } | null> => {
    const checklistTemplate = await getChecklistTemplateOnly(id);
    if (!checklistTemplate) return null;
    const { fields, fieldGroups } = await getFieldsAndGroups(checklistTemplate.id);
    return { checklistTemplate: { ...checklistTemplate, fieldGroups }, fields };
  };

  return {
    getChecklistTemplateApi,
    getChecklistTemplateOnly,
    getFieldsAndGroups,
  };
};
