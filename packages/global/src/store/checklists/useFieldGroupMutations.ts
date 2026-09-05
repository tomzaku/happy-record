import { v4 } from 'uuid';
import { useMutation, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { fieldGroupsKeys } from './fieldGroupsKeys';
import { patchFieldGroupRepeat, saveFieldGroup } from './fieldGroupsApi';
import { writeGroup, writeGroupIfPresent, type FieldGroupsMap } from './fieldGroupsCache';
import type { FieldGroup } from './fieldGroupTypes';

type RollbackContext = {
  previousFromAll: FieldGroup | undefined;
  previousFromTemplate: FieldGroup | undefined;
};

type Deps = { userId: string | undefined; queryClient: QueryClient; allKey: QueryKey };

/** The write side of field-groups — see useFieldGroups.tsx, which composes this with the read
 * side. */
export function useFieldGroupMutations({ userId, queryClient, allKey }: Deps) {
  // Per-entity rollback (see useTags.tsx). Writes both the bulk "all mine" cache (if loaded) and
  // this group's own `byTemplate` cache, so whichever one a reader looks through reflects it.
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
   * (ChecklistFieldGroup.tsx's own updateFieldGroupAt). */
  const updateFieldGroup = (group: FieldGroup): FieldGroup => {
    const updated: FieldGroup = { ...group, updatedAt: new Date().toISOString() };
    saveFieldGroupMutation.mutate(updated);
    return updated;
  };

  const archiveFieldGroup = (group: FieldGroup): FieldGroup =>
    updateFieldGroup({ ...group, archivedAt: new Date().toISOString() });

  /** A challenge participant's own override of one group's schedule — never the owner's full-row
   * updateFieldGroup (which they can't write). `repeat: null` clears it back to following the
   * owner's. The request always fires; only the local optimistic write is skipped when the group
   * isn't cached yet. */
  const updateMyFieldGroupRepeat = (
    fieldGroupId: string,
    checklistTemplateId: string,
    repeat: FieldGroup['repeat'] | null,
  ) => {
    updateMyFieldGroupRepeatMutation.mutate({ fieldGroupId, checklistTemplateId, repeat });
  };

  return { addFieldGroup, updateFieldGroup, archiveFieldGroup, updateMyFieldGroupRepeat };
}
