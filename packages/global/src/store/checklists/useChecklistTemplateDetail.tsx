import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { useFieldGroups } from './useFieldGroups';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { fetchOneTemplate } from './checklistTemplateFetch';

/**
 * One template by id, as a real query — for a single-id consumer (detail-task-page,
 * tasks-shared-page-ui, challenge-dashboard-page-ui). Own template, or anyone's if
 * `visibility: 'public'`.
 */
export const useChecklistTemplateDetail = (id: string | undefined) => {
  const { userId, ready } = useSession();
  const { getFieldGroups } = useFieldGroups();
  const { data, isLoading } = useQuery({
    queryKey: checklistTemplatesKeys.byId(id, userId),
    queryFn: () => fetchOneTemplate(id as string),
    enabled: ready && !!id,
    staleTime: Infinity,
  });

  const template = React.useMemo(
    () => (data ? { ...data, fieldGroups: getFieldGroups(data.id) } : undefined),
    [data, getFieldGroups],
  );

  return { template, isLoading };
};
