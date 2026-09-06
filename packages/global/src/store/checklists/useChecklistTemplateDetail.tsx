import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { useFieldGroups, useFieldGroupsForTemplate } from './useFieldGroups';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { fetchOneTemplate } from './checklistTemplateFetch';

/**
 * One template by id, as a real query — for a single-id consumer (detail-task-page,
 * tasks-shared-page-ui, challenge-dashboard-page-ui). Own template, or anyone's if
 * `visibility: 'public'`.
 */
export const useChecklistTemplateDetail = (id: string | undefined) => {
  const { userId, ready } = useSession();
  const { getFieldGroups, allGroupsSettled } = useFieldGroups();
  const { data, isLoading } = useQuery({
    queryKey: checklistTemplatesKeys.byId(id, userId),
    queryFn: () => fetchOneTemplate(id as string),
    enabled: ready && !!id,
    staleTime: Infinity,
  });

  // `isOwned: true` keeps getFieldGroups from firing its own unsubscribed fallback fetch (fine
  // for a loop over many templates, but nothing re-renders here once it resolves) — a joined
  // challenge's own groups never show up in "all mine" either way, so once that's settled and
  // still empty, useFieldGroupsForTemplate's real subscribed query is what actually fetches them
  // and re-renders when it lands, instead of leaving the section empty until a reload.
  const ownFieldGroups = data ? getFieldGroups(data.id, true) : [];
  const needsFallbackFetch = !!data && allGroupsSettled && ownFieldGroups.length === 0;
  const { fieldGroups: fetchedFieldGroups } = useFieldGroupsForTemplate(
    needsFallbackFetch ? data?.id : undefined,
  );

  const template = React.useMemo(() => {
    if (!data) return undefined;
    const fieldGroups = ownFieldGroups.length > 0 ? ownFieldGroups : fetchedFieldGroups;
    return { ...data, fieldGroups };
  }, [data, ownFieldGroups, fetchedFieldGroups]);

  return { template, isLoading };
};
