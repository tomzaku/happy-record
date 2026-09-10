import { v4 } from 'uuid';
import { useMutation, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { patchFieldGroupRepeat, saveFieldGroup } from './fieldGroupsApi';
import type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';
import type { FieldGroup } from './fieldGroupTypes';

// Snapshots (and reverts) one specific group, never the whole template — two sibling groups on
// the same template can each be mid-save at once, and a template is one shared cache entry now
// (checklist-templates-dto.ts), not each group's own independent row the way the old separate
// field-groups resource had. A stale whole-template snapshot taken when group A's write started
// would, on A's own rollback, wipe out group B's write that had already landed in between — this
// is that exact "whole-map snapshot rolling back over a sibling write" bug, just one level deeper
// than the template-level version useChecklistTemplateMutations.ts/useTags.tsx already guard
// against, since here the *shared object* being patched is one level down from the cache entry
// itself.
type RollbackContext = {
  previousGroupFromAll: FieldGroup | undefined;
  previousGroupFromId: FieldGroup | undefined;
};

type Deps = { userId: string | undefined; queryClient: QueryClient };

// Same two tiny cache-writing helpers useChecklistTemplateMutations.ts has its own copies of —
// not imported from there on purpose: that file pulls in checklistTemplatesApi.ts's own
// `@supabase/supabase-js` chain, which this file otherwise has no reason to depend on.
function writeTemplate(queryClient: QueryClient, key: QueryKey, template: ChecklistTemplate | null) {
  queryClient.setQueryData(key, template);
}

function writeTemplateIfPresent(queryClient: QueryClient, key: QueryKey, id: string, template: ChecklistTemplate | undefined) {
  queryClient.setQueryData<ChecklistTemplatesMap>(key, prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (template) next[id] = template;
    else delete next[id];
    return next;
  });
}

function withGroup(template: ChecklistTemplate, group: FieldGroup): ChecklistTemplate {
  const index = template.fieldGroups.findIndex(g => g.id === group.id);
  const fieldGroups =
    index >= 0
      ? template.fieldGroups.map((g, i) => (i === index ? group : g))
      : [...template.fieldGroups, group];
  return { ...template, fieldGroups };
}

function withoutGroup(template: ChecklistTemplate, groupId: string): ChecklistTemplate {
  return { ...template, fieldGroups: template.fieldGroups.filter(g => g.id !== groupId) };
}

// The inverse of whatever `withGroup`/an in-place edit just did to this one group — restore its
// previous version if it had one, or drop it entirely if this write was the one that created it.
// Always reads `template` fresh (the caller's current cache read, not a value captured back in
// `onMutate`), so a sibling group's write that landed in between is never touched.
function revertGroup(template: ChecklistTemplate, groupId: string, previousGroup: FieldGroup | undefined): ChecklistTemplate {
  return previousGroup ? withGroup(template, previousGroup) : withoutGroup(template, groupId);
}

/** The write side of field-groups — see useFieldGroups.tsx, which is just this. */
export function useFieldGroupMutations({ userId, queryClient }: Deps) {
  const allKey = checklistTemplatesKeys.all(userId);

  const saveFieldGroupMutation = useMutation<{ ok: true }, Error, FieldGroup, RollbackContext>({
    mutationFn: async group => {
      const result = await saveFieldGroup(group);
      if (!result) throw new Error('Failed to save field group');
      return result;
    },
    onMutate: async group => {
      const idKey = checklistTemplatesKeys.byId(group.checklistTemplateId, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      const templateFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[group.checklistTemplateId];
      const templateFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      const previousGroupFromAll = templateFromAll?.fieldGroups.find(g => g.id === group.id);
      const previousGroupFromId = templateFromId?.fieldGroups.find(g => g.id === group.id);
      if (templateFromAll) writeTemplateIfPresent(queryClient, allKey, group.checklistTemplateId, withGroup(templateFromAll, group));
      if (templateFromId) writeTemplate(queryClient, idKey, withGroup(templateFromId, group));
      return { previousGroupFromAll, previousGroupFromId };
    },
    onError: (_error, group, context) => {
      const idKey = checklistTemplatesKeys.byId(group.checklistTemplateId, userId);
      const currentFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[group.checklistTemplateId];
      const currentFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      if (currentFromAll) {
        writeTemplateIfPresent(queryClient, allKey, group.checklistTemplateId, revertGroup(currentFromAll, group.id, context?.previousGroupFromAll));
      }
      if (currentFromId) writeTemplate(queryClient, idKey, revertGroup(currentFromId, group.id, context?.previousGroupFromId));
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
      const idKey = checklistTemplatesKeys.byId(checklistTemplateId, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      const templateFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[checklistTemplateId];
      const templateFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      const previousGroupFromAll = templateFromAll?.fieldGroups.find(g => g.id === fieldGroupId);
      const previousGroupFromId = templateFromId?.fieldGroups.find(g => g.id === fieldGroupId);
      const updatedAt = new Date().toISOString();
      if (templateFromAll && previousGroupFromAll) {
        writeTemplateIfPresent(
          queryClient,
          allKey,
          checklistTemplateId,
          withGroup(templateFromAll, { ...previousGroupFromAll, repeat: repeat ?? undefined, updatedAt }),
        );
      }
      if (templateFromId && previousGroupFromId) {
        writeTemplate(queryClient, idKey, withGroup(templateFromId, { ...previousGroupFromId, repeat: repeat ?? undefined, updatedAt }));
      }
      return { previousGroupFromAll, previousGroupFromId };
    },
    onError: (_error, { fieldGroupId, checklistTemplateId }, context) => {
      const idKey = checklistTemplatesKeys.byId(checklistTemplateId, userId);
      const currentFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[checklistTemplateId];
      const currentFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      if (currentFromAll && context?.previousGroupFromAll) {
        writeTemplateIfPresent(queryClient, allKey, checklistTemplateId, withGroup(currentFromAll, context.previousGroupFromAll));
      }
      if (currentFromId && context?.previousGroupFromId) {
        writeTemplate(queryClient, idKey, withGroup(currentFromId, context.previousGroupFromId));
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
