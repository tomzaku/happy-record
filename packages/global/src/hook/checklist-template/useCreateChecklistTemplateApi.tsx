// Publishes a checklist template as shareable — the write side of
// `/checklist-template/shared/:id`. See CLAUDE.md and
// useGetChecklistTemplateApi.tsx (the read side).
//
// Sharing only ever flips the *template's* own visibility to public — a field it references
// stays exactly whatever visibility it already had (private, for a real user's own field; this
// route never touches that column). This used to also flip every referenced field to
// `visibility: 'public'`, since a public template alone couldn't resolve field ids that only
// existed for its owner — but that made the field usable in *anyone's* checklist template
// platform-wide, not just visible to whoever the specific share link went to, which is a much
// bigger grant than "share this one template" was ever meant to be. The read side now resolves a
// public template's own fields a different way — `GET /fields?templateId=`
// (supabase/functions/fields/index.ts's own listByTemplate) — authorized by the template being
// public, not by the field itself becoming public.
import { saveChecklistTemplate } from '../../store/checklists/checklistTemplatesApi';
import type { ChecklistTemplate } from '../../store/checklists/useChecklistTemplates';

export const useCreateChecklistTemplate = () => {
  const updateChecklistTemplate = async (data: { checklistTemplate: ChecklistTemplate }) => {
    await saveChecklistTemplate(data.checklistTemplate);
    return { id: data.checklistTemplate.id };
  };
  return {
    updateChecklistTemplate,
  };
};
