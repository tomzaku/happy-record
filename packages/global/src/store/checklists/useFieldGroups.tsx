import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { useFieldGroupMutations } from './useFieldGroupMutations';

/**
 * The write side of field-groups (add/update/archive a group, or a participant's own reminder
 * override) — the read side is gone: `fieldGroups` is a real column on `ChecklistTemplate` again
 * (see checklist-templates-dto.ts's own header comment), embedded server-side and threaded
 * straight through by `useChecklistTemplates.tsx`/`useChecklistTemplateDetail.tsx`, so a consumer
 * just reads `checklistTemplate[id].fieldGroups` directly — no separate fetch, ownership check, or
 * fallback query to reason about (this used to be exactly that: a bulk "all mine" fetch plus a
 * per-template fallback for a joined challenge's groups, which a joined template's groups — owned
 * by the sharer, never the caller — could only ever resolve via a second round trip the client had
 * to remember to make and re-render on; see git history if you need the old shape).
 */
export const useFieldGroups = () => {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useFieldGroupMutations({ userId, queryClient });
};
