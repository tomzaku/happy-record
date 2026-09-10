// Reads a shared checklist template — the `/checklist-template/shared/:id`
// page's data source. See CLAUDE.md and useCreateChecklistTemplateApi.tsx
// (the write side that makes the template itself public).
import { fetchChecklistTemplateById } from '../../store/checklists/checklistTemplatesApi';
import { fetchRecordFieldsByTemplateId } from '../../store/record-field/recordFieldApi';
import type { ChecklistTemplate } from '../../store/checklists/useChecklistTemplates';
import type { RecordField } from '../../store/record-field/useRecordField';

export const useGetChecklistTemplateApi = () => {
  // `fetchChecklistTemplateById`'s own result already carries `fieldGroups` embedded
  // (checklist-templates-dto.ts) — no separate fetch needed for those anymore. Split out from
  // `getFields` below purely so a caller that wants to render as soon as the template itself is
  // in (the shared-template page's own headline/card) doesn't have to wait on `fields` too — see
  // useChecklistTemplateSharedPage.ts.
  const getChecklistTemplateOnly = async (id: string): Promise<ChecklistTemplate | null> => {
    const result = await fetchChecklistTemplateById(id);
    // Not public, not this caller's own, or genuinely doesn't exist — RLS
    // and "no such id" look the same from here, on purpose.
    return result?.templates[0] ?? null;
  };

  /** Fields are resolved by template id, not by the referenced field ids directly — a shared
   * template's own fields stay `visibility: 'private'` (see fields/index.ts's own listByTemplate),
   * authorized by this template being public rather than by the fields themselves. */
  const getFields = async (checklistTemplateId: string): Promise<{ fields: RecordField[] }> => {
    const result = await fetchRecordFieldsByTemplateId(checklistTemplateId);
    return { fields: result?.fields ?? [] };
  };

  /** The full, atomic read — useJoinChallenge's own need, which has to act on the complete
   * picture in one shot rather than rendering progressively. */
  const getChecklistTemplateApi = async (
    id: string,
  ): Promise<{ checklistTemplate: ChecklistTemplate; fields: RecordField[] } | null> => {
    const checklistTemplate = await getChecklistTemplateOnly(id);
    if (!checklistTemplate) return null;
    const { fields } = await getFields(checklistTemplate.id);
    return { checklistTemplate, fields };
  };

  return {
    getChecklistTemplateApi,
    getChecklistTemplateOnly,
    getFields,
  };
};
