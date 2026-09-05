import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { fieldGroupsKeys } from './fieldGroupsKeys';
import { fetchFieldGroups } from './fieldGroupsApi';
import { toFieldGroupsMap, type FieldGroupsMap } from './fieldGroupsCache';
import { useFieldGroupMutations } from './useFieldGroupMutations';
import type { FieldGroup } from './fieldGroupTypes';

export { useFieldGroupsForTemplate } from './useFieldGroupsForTemplate';

/**
 * A real table now (`field_groups`), not jsonb embedded in `checklist_templates.field_groups`.
 * `getFieldGroups`/`getFieldGroupsByTemplateId` stay plain callback functions (not hooks)
 * because they're called with a dynamic id from loops over many templates and one-off call
 * sites, neither of which rules-of-hooks allows for a real `useQuery` call.
 */
export const useFieldGroups = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();

  // Always fetched once the session is ready — no lazy trigger to reason about.
  const allKey = fieldGroupsKeys.all(userId);
  const { data: allGroups, isSuccess: allGroupsSettled } = useQuery<FieldGroupsMap>({
    queryKey: allKey,
    queryFn: async () => {
      const result = await fetchFieldGroups();
      if (!result) throw new Error('Failed to fetch field groups');
      return toFieldGroupsMap(result.fieldGroups);
    },
    enabled: ready,
    staleTime: Infinity,
  });

  const fetchOneTemplate = React.useCallback(
    (checklistTemplateId: string) => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(checklistTemplateId, userId);
      // `ensureQueryData` dedupes on its own (an in-flight call is reused, a fresh key skips the
      // network entirely) — quiet, a failure just leaves whatever's already cached as fallback.
      queryClient
        .ensureQueryData({
          queryKey: byTemplateKey,
          queryFn: async () => {
            const result = await fetchFieldGroups({ checklistTemplateId });
            if (!result) throw new Error('Failed to fetch field groups');
            return toFieldGroupsMap(result.fieldGroups);
          },
          staleTime: Infinity,
        })
        .catch(() => {});
      return byTemplateKey;
    },
    [queryClient, userId],
  );

  // Reads whatever's already cached for this template without triggering a new fetch — used
  // while "all mine" is still settling, so a fresh edit stays visible immediately.
  const peekByTemplateCache = React.useCallback(
    (checklistTemplateId: string): FieldGroup[] => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(checklistTemplateId, userId);
      return Object.values(queryClient.getQueryData<FieldGroupsMap>(byTemplateKey) ?? {})
        .filter(group => group.checklistTemplateId === checklistTemplateId)
        .sort((a, b) => a.position - b.position);
    },
    [queryClient, userId],
  );

  const readByTemplateCache = React.useCallback(
    (checklistTemplateId: string): FieldGroup[] => {
      if (!ready || !checklistTemplateId) return [];
      fetchOneTemplate(checklistTemplateId);
      return peekByTemplateCache(checklistTemplateId);
    },
    [ready, fetchOneTemplate, peekByTemplateCache],
  );

  /** One template's own groups: waits for "all mine" to settle (peeking the per-template cache
   * meanwhile, so an in-progress optimistic write stays visible), reads it once settled, and
   * falls back to a per-template fetch unless `isOwned` is true — an owned id missing from a
   * settled "all mine" is proof of a real zero; a joined challenge's own rows genuinely need the
   * fetch, since "all mine" never covers them. Called in a loop over many templates, so this
   * can't wait for some other component to mount useFieldGroupsForTemplate first. */
  const getFieldGroups = React.useCallback(
    (checklistTemplateId: string, isOwned?: boolean): FieldGroup[] => {
      if (!allGroupsSettled) return peekByTemplateCache(checklistTemplateId);
      const fromAll = Object.values(allGroups ?? {})
        .filter(group => group.checklistTemplateId === checklistTemplateId)
        .sort((a, b) => a.position - b.position);
      if (fromAll.length > 0) return fromAll;
      if (isOwned) return [];
      return readByTemplateCache(checklistTemplateId);
    },
    [allGroupsSettled, allGroups, peekByTemplateCache, readByTemplateCache],
  );

  // Same as getFieldGroups but always takes the per-template path — for a caller that already
  // knows it needs the bypass (a joined challenge's own detail view).
  const getFieldGroupsByTemplateId = readByTemplateCache;

  const { addFieldGroup, updateFieldGroup, archiveFieldGroup, updateMyFieldGroupRepeat } =
    useFieldGroupMutations({ userId, queryClient, allKey });

  return {
    getFieldGroups,
    getFieldGroupsByTemplateId,
    addFieldGroup,
    updateFieldGroup,
    archiveFieldGroup,
    updateMyFieldGroupRepeat,
  };
};
