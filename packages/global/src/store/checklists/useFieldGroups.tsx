import React from 'react';
import { v4 } from 'uuid';
import { useMutation, useQuery, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { useSession } from '../../hook/useSession';
import { normalizeFieldGroupFields, type FieldGroup, type FieldGroupField } from './useChecklistTemplates';
import { fieldGroupsKeys } from './fieldGroupsKeys';

// Every backend call here is quiet: a failure resolves to null and this
// hook's own in-memory state is the fallback, unchanged.
import { fetchFieldGroups, patchFieldGroupRepeat, saveFieldGroup } from './fieldGroupsApi';

type FieldGroupsMap = Record<string, FieldGroup>;
type RollbackContext = {
  previousFromAll: FieldGroup | undefined;
  previousFromTemplate: FieldGroup | undefined;
};

// A row saved before FieldGroupField existed still has `fields` as plain id strings — see
// normalizeFieldGroupFields' own comment. Every fetch path below funnels through here.
function toFieldGroupsMap(groups: FieldGroup[]): FieldGroupsMap {
  const map: FieldGroupsMap = {};
  for (const group of groups) {
    map[group.id] = {
      ...group,
      fields: normalizeFieldGroupFields(group.fields as unknown as (string | FieldGroupField)[]),
    };
  }
  return map;
}

// Writes unconditionally — creates the cache entry from nothing if it didn't exist yet. Used for
// the query most directly relevant to whoever's making a given write (byTemplate), matching this
// app's usual "an optimistic write is always visible immediately" rule.
function writeGroup(queryClient: QueryClient, key: QueryKey, groupId: string, group: FieldGroup | undefined) {
  queryClient.setQueryData<FieldGroupsMap>(key, prev => {
    const next = { ...prev };
    if (group) next[groupId] = group;
    else delete next[groupId];
    return next;
  });
}

// Writes only if the cache already holds real data — used for the bulk "all mine" query, which a
// write shouldn't silently fabricate a "loaded" state for if it was never actually fetched.
function writeGroupIfPresent(queryClient: QueryClient, key: QueryKey, groupId: string, group: FieldGroup | undefined) {
  queryClient.setQueryData<FieldGroupsMap>(key, prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (group) next[groupId] = group;
    else delete next[groupId];
    return next;
  });
}

/**
 * One template's own groups (active + archived — callers filter via getActiveFieldGroups),
 * ordered by `position`, as a real per-scope query — this is what a single-id consumer
 * (detail-task-page, which already knows its exact checklistTemplateId from the URL) should call
 * directly, in place of the old `useSyncedSelector(getFieldGroupsByTemplateId, id)` pattern.
 *
 * Never short-circuited by the bulk "all mine" query — a joined challenge's field groups are the
 * *owner's* own rows, which "all mine" (own templates only) never includes. Exactly the same
 * "own + public only can't resolve a participant's template" gap `fields`' own
 * `getRecordFieldsByTemplateId` has: this always fetches (or reads, once cached) the specific
 * template's own groups regardless of ownership, which is what actually resolves a challenge
 * participant otherwise seeing "No groups created" on the owner's real template.
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

/**
 * A real table now (`field_groups`), not jsonb embedded in `checklist_templates.field_groups` —
 * see 20260829010000_notes_note_id_ownership.sql. Reads are real, per-scope React Query queries
 * (see useFieldGroupsForTemplate above and `allKey` below) rather than one shared cache entry —
 * `getFieldGroups`/`getFieldGroupsByTemplateId` stay plain callback functions here (not hooks
 * themselves) because they're called with a dynamic id from loops over many templates
 * (getChecklistTemplateIdsByGivingDate) and one-off call sites across many components, neither of
 * which rules-of-hooks allows for a real `useQuery` call — they read from (and, for a template not
 * yet covered by the bulk query, actively populate via `queryClient.ensureQueryData`) the exact
 * same cache entries `useFieldGroupsForTemplate` and the bulk query below use, so all three stay
 * consistent no matter which one a given caller reaches for.
 */
export const useFieldGroups = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();

  // Always fetched once the session is ready — every one of this app's other resources this size
  // fetches "all mine" unconditionally the same way; there's no lazy trigger to reason about.
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
      // `ensureQueryData` is the imperative, one-shot-fetch primitive here — it dedupes on its
      // own (a second call for the same key while the first is still in flight reuses it, and a
      // key already fresh — see staleTime — skips the network call entirely), replacing the old
      // hand-rolled `fetchedScopes` Set for this exact purpose. Quiet: a failure just leaves
      // whatever's already cached (nothing, the first time) as the fallback, same as every other
      // read in this app.
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

  // Reads whatever's already cached for this template — an optimistic write, or a previous
  // fetch — without triggering a new network call. Used while "all mine" is still settling, so a
  // fresh edit stays visible immediately without also firing a redundant individual fetch that
  // the bulk request was about to cover anyway.
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

  /** One template's own groups:
   *   1. "All mine" hasn't settled yet → peek whatever's already cached for this one template
   *      (an in-progress optimistic write, say), without firing a new fetch — the bulk request
   *      already in flight will cover it in a moment.
   *   2. Settled and this template is in there → done, no network call.
   *   3. Settled and it's not, but the caller knows this id is owned (`isOwned: true`, from
   *      checklist-templates' own "all mine" map) → that's proof it genuinely has zero groups.
   *   4. Otherwise (not owned, or ownership unknown) → fetch it directly. This is what actually
   *      resolves a joined challenge's field groups, which are the *owner's* rows and never show
   *      up in "all mine" (own templates only), no matter how long it's been fetched.
   * Called in a loop over many templates (getRecommendChecklistTemplates/
   * getChecklistTemplateIdsByGivingDate), so this can't wait for some other component to mount
   * `useFieldGroupsForTemplate` itself first. */
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

  /** Same as getFieldGroups, but always takes the per-template path — see its own comment for
   * when that fallback matters. Exposed separately for a caller that wants to force the bypass
   * without relying on getFieldGroups' own "empty in 'all mine' means try per-template" heuristic
   * (a joined challenge's own detail view, which already knows this is exactly that case). */
  const getFieldGroupsByTemplateId = readByTemplateCache;

  // Canonical React Query optimistic-update shape (used by both `addFieldGroup` and
  // `updateFieldGroup` below, since the wire call for either is the same upsert) — see
  // useTags.tsx's own saveTagMutation for the full rationale (per-entity rollback, no onSettled
  // refetch). Writes to both the bulk "all mine" cache (if it's actually loaded) and this group's
  // own `byTemplate` cache (unconditionally), so whichever one a reader is looking at reflects
  // the write.
  const saveFieldGroupMutation = useMutation<{ ok: true }, Error, FieldGroup, RollbackContext>({
    mutationFn: async group => {
      const result = await saveFieldGroup(group);
      if (!result) throw new Error('Failed to save field group');
      return result;
    },
    onMutate: async group => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(group.checklistTemplateId, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: byTemplateKey });
      const previousFromAll = queryClient.getQueryData<FieldGroupsMap>(allKey)?.[group.id];
      const previousFromTemplate = queryClient.getQueryData<FieldGroupsMap>(byTemplateKey)?.[group.id];
      writeGroupIfPresent(queryClient, allKey, group.id, group);
      writeGroup(queryClient, byTemplateKey, group.id, group);
      return { previousFromAll, previousFromTemplate };
    },
    onError: (_error, group, context) => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(group.checklistTemplateId, userId);
      writeGroupIfPresent(queryClient, allKey, group.id, context?.previousFromAll);
      writeGroup(queryClient, byTemplateKey, group.id, context?.previousFromTemplate);
    },
  });

  const updateMyFieldGroupRepeatMutation = useMutation<
    { ok: true },
    Error,
    { fieldGroupId: string; checklistTemplateId: string; repeat: FieldGroup['repeat'] | null },
    RollbackContext
  >({
    mutationFn: async ({ fieldGroupId, repeat }) => {
      const result = await patchFieldGroupRepeat(fieldGroupId, repeat);
      if (!result) throw new Error('Failed to update field group repeat');
      return result;
    },
    onMutate: async ({ fieldGroupId, checklistTemplateId, repeat }) => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(checklistTemplateId, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: byTemplateKey });
      const previousFromAll = queryClient.getQueryData<FieldGroupsMap>(allKey)?.[fieldGroupId];
      const previousFromTemplate = queryClient.getQueryData<FieldGroupsMap>(byTemplateKey)?.[fieldGroupId];
      const updatedAt = new Date().toISOString();
      const applyRepeat = (existing: FieldGroup | undefined) =>
        existing && { ...existing, repeat: repeat ?? undefined, updatedAt };
      writeGroupIfPresent(queryClient, allKey, fieldGroupId, applyRepeat(previousFromAll) || undefined);
      writeGroupIfPresent(queryClient, byTemplateKey, fieldGroupId, applyRepeat(previousFromTemplate) || undefined);
      return { previousFromAll, previousFromTemplate };
    },
    onError: (_error, { fieldGroupId, checklistTemplateId }, context) => {
      const byTemplateKey = fieldGroupsKeys.byTemplate(checklistTemplateId, userId);
      if (context?.previousFromAll) writeGroupIfPresent(queryClient, allKey, fieldGroupId, context.previousFromAll);
      if (context?.previousFromTemplate) {
        writeGroupIfPresent(queryClient, byTemplateKey, fieldGroupId, context.previousFromTemplate);
      }
    },
  });

  const addFieldGroup = (group: Omit<FieldGroup, 'id' | 'updatedAt'> & { id?: string }): FieldGroup => {
    const id = group.id ?? v4();
    const newGroup: FieldGroup = { ...group, id, updatedAt: new Date().toISOString() };
    saveFieldGroupMutation.mutate(newGroup);
    return newGroup;
  };

  /** One row, no index bookkeeping — replaces the old whole-array splice
   * (`ChecklistFieldGroup.tsx`'s own `updateFieldGroupAt`). */
  const updateFieldGroup = (group: FieldGroup): FieldGroup => {
    const updated: FieldGroup = { ...group, updatedAt: new Date().toISOString() };
    saveFieldGroupMutation.mutate(updated);
    return updated;
  };

  const archiveFieldGroup = (group: FieldGroup): FieldGroup =>
    updateFieldGroup({ ...group, archivedAt: new Date().toISOString() });

  /** A challenge participant's own override of one group's schedule — PATCH `/field-groups/:id
   * { repeat }`, never the owner's full-row `updateFieldGroup` above (which they can't write
   * anyway — see the edge function's own doc comment). `repeat: null` clears it back to
   * following the owner's. Optimistic, same as every other write here: updates the local copy
   * immediately, fires the request, doesn't await it. The request itself always fires regardless
   * of whether this device has the group cached yet — only the *local* optimistic write is
   * skipped when it isn't (there's nothing cached to update), matching this function's original
   * behavior. */
  const updateMyFieldGroupRepeat = (fieldGroupId: string, checklistTemplateId: string, repeat: FieldGroup['repeat'] | null) => {
    updateMyFieldGroupRepeatMutation.mutate({ fieldGroupId, checklistTemplateId, repeat });
  };

  return {
    getFieldGroups,
    getFieldGroupsByTemplateId,
    updateMyFieldGroupRepeat,
    addFieldGroup,
    updateFieldGroup,
    archiveFieldGroup,
  };
};
