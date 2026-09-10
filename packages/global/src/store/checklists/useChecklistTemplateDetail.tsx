import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { fetchOneTemplate } from './checklistTemplateFetch';

/**
 * One template by id, as a real query — for a single-id consumer (detail-task-page,
 * tasks-shared-page-ui, challenge-dashboard-page-ui). Own template, or anyone's if
 * `visibility: 'public'`. `fieldGroups` arrives embedded on the row itself now
 * (checklist-templates-dto.ts) — no separate fetch/merge step needed here anymore (there used to
 * be one; see git history if you need the old shape).
 */
export const useChecklistTemplateDetail = (id: string | undefined) => {
  const { userId, ready } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: checklistTemplatesKeys.byId(id, userId),
    queryFn: () => fetchOneTemplate(id as string),
    enabled: ready && !!id,
    staleTime: Infinity,
  });

  return { template: data ?? undefined, isLoading };
};
