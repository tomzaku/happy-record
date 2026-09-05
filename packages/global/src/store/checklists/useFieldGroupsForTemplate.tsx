import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { fieldGroupsKeys } from './fieldGroupsKeys';
import { fetchFieldGroups } from './fieldGroupsApi';
import { toFieldGroupsMap, type FieldGroupsMap } from './fieldGroupsCache';

/**
 * One template's own groups (active + archived — callers filter via getActiveFieldGroups),
 * ordered by `position`, as a real per-scope query — for a single-id consumer (detail-task-page,
 * which already knows its exact checklistTemplateId) in place of
 * `useSyncedSelector(getFieldGroupsByTemplateId, id)`.
 *
 * Never short-circuited by the bulk "all mine" query — a joined challenge's field groups are the
 * *owner's* own rows, which "all mine" never includes. Always fetches (or reads, once cached) the
 * specific template's own groups regardless of ownership.
 */
export const useFieldGroupsForTemplate = (checklistTemplateId: string | undefined) => {
  const { userId, ready } = useSession();
  const { data, isLoading } = useQuery<FieldGroupsMap>({
    queryKey: fieldGroupsKeys.byTemplate(checklistTemplateId, userId),
    queryFn: async () => {
      const result = await fetchFieldGroups({ checklistTemplateId });
      if (!result) throw new Error('Failed to fetch field groups');
      return toFieldGroupsMap(result.fieldGroups);
    },
    enabled: ready && !!checklistTemplateId,
    staleTime: Infinity,
  });

  const fieldGroups = React.useMemo(
    () => Object.values(data ?? {}).sort((a, b) => a.position - b.position),
    [data],
  );

  return { fieldGroups, isLoading };
};
