import { v4 } from 'uuid';
import { useMutation, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { checklistLogsKeys } from '../checklist-logs/checklistLogsKeys';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import {
  patchChecklistTemplate,
  removeChecklistTemplate as removeChecklistTemplateApi,
  saveChecklistTemplate,
  fetchChecklistTemplateById,
} from './checklistTemplatesApi';
import type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';

type RollbackContext = {
  previousFromAll: ChecklistTemplate | undefined;
  previousFromId: ChecklistTemplate | undefined;
};
type SaveTemplateArgs = {
  template: ChecklistTemplate;
  wire: { kind: 'create' } | { kind: 'patch'; changes: Record<string, unknown> } | { kind: 'none' };
};

function writeTemplate(queryClient: QueryClient, key: QueryKey, template: ChecklistTemplate | null) {
  queryClient.setQueryData(key, template);
}

// A write shouldn't fabricate a "loaded" bulk cache if it was never fetched.
function writeTemplateIfPresent(queryClient: QueryClient, key: QueryKey, id: string, template: ChecklistTemplate | undefined) {
  queryClient.setQueryData<ChecklistTemplatesMap>(key, prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (template) next[id] = template;
    else delete next[id];
    return next;
  });
}

// Keeps `repeat.dayOfWeek` in sync with field-group schedules, for display-only consumers (share
// cards, ChecklistToday's label) — real gating always derives it fresh, never trusts this.
function withSyncedRepeat(template: ChecklistTemplate): ChecklistTemplate {
  if (!template.repeat || !template.fieldGroups?.length) return template;
  const dayOfWeek = getEffectiveDayOfWeek(template);
  if (dayOfWeek === undefined || dayOfWeek === template.repeat.dayOfWeek) return template;
  return { ...template, repeat: { ...template.repeat, dayOfWeek } };
}

type Deps = {
  userId: string | undefined;
  queryClient: QueryClient;
  allKey: QueryKey;
  checklistTemplate: ChecklistTemplatesMap;
  markTemplateIdKnown: (id: string) => void;
  selectChecklistTemplate: (id: string) => void;
  deselectChecklistTemplate: (id: string) => void;
  mergeTemplates: (fetched: ChecklistTemplate[]) => void;
};

/** The write side of checklist-templates — see useChecklistTemplates.tsx, which composes this
 * with the read side (useChecklistTemplatesQuery). */
export function useChecklistTemplateMutations({
  userId,
  queryClient,
  allKey,
  checklistTemplate,
  markTemplateIdKnown,
  selectChecklistTemplate,
  deselectChecklistTemplate,
  mergeTemplates,
}: Deps) {
  const invalidateChecklistLogs = () => queryClient.invalidateQueries({ queryKey: checklistLogsKeys.all });

  // Per-entity rollback (see useTags.tsx). Writes both caches — a write here is always the
  // caller's own template, safe to reflect in "all mine" too.
  const saveTemplateMutation = useMutation<{ ok: true }, Error, SaveTemplateArgs, RollbackContext>({
    mutationFn: async ({ template, wire }) => {
      if (wire.kind === 'none') return { ok: true };
      const result =
        wire.kind === 'create'
          ? await saveChecklistTemplate(template)
          : await patchChecklistTemplate(template.id, wire.changes);
      if (!result) throw new Error('Failed to save checklist template');
      return result;
    },
    onMutate: async ({ template }) => {
      markTemplateIdKnown(template.id);
      const idKey = checklistTemplatesKeys.byId(template.id, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      const previousFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[template.id];
      const previousFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      writeTemplateIfPresent(queryClient, allKey, template.id, template);
      writeTemplate(queryClient, idKey, template);
      return { previousFromAll, previousFromId };
    },
    onSuccess: (_result, { wire }) => {
      if (wire.kind === 'create') invalidateChecklistLogs();
    },
    onError: (_error, { template }, context) => {
      const idKey = checklistTemplatesKeys.byId(template.id, userId);
      writeTemplateIfPresent(queryClient, allKey, template.id, context?.previousFromAll);
      writeTemplate(queryClient, idKey, context?.previousFromId ?? null);
    },
  });

  const removeTemplateMutation = useMutation<{ ok: true }, Error, string, RollbackContext>({
    mutationFn: async id => {
      const result = await removeChecklistTemplateApi(id);
      if (!result) throw new Error('Failed to remove checklist template');
      return result;
    },
    onMutate: async id => {
      const idKey = checklistTemplatesKeys.byId(id, userId);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      const previousFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[id];
      const previousFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      writeTemplateIfPresent(queryClient, allKey, id, undefined);
      writeTemplate(queryClient, idKey, null);
      return { previousFromAll, previousFromId };
    },
    onSuccess: () => invalidateChecklistLogs(),
    onError: (_error, id, context) => {
      const idKey = checklistTemplatesKeys.byId(id, userId);
      if (context?.previousFromAll) writeTemplateIfPresent(queryClient, allKey, id, context.previousFromAll);
      if (context?.previousFromId) writeTemplate(queryClient, idKey, context.previousFromId);
    },
  });

  const addChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    keepId = false,
  ) => {
    const id = keepId && currentChecklistTemplate.id ? currentChecklistTemplate.id : v4();
    const template: ChecklistTemplate = withSyncedRepeat({
      ...currentChecklistTemplate,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    selectChecklistTemplate(id);
    // Optimistic — `saved` lets a rare caller (useJoinChallenge.tsx forking a template then
    // inserting a challenge_participants row with a real FK to it) await the write landing before
    // racing a dependent insert. Never rejects, same as every other quiet write here.
    const saved = saveTemplateMutation.mutateAsync({ template, wire: { kind: 'create' } }).catch(() => null);
    return { id, saved };
  };

  const updateChecklistTemplate = (currentChecklistTemplate: Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'>) => {
    const existing = checklistTemplate[currentChecklistTemplate.id];
    const template: ChecklistTemplate = withSyncedRepeat({
      ...existing,
      ...currentChecklistTemplate,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!existing) {
      // Nothing on the server yet — this is really a create, not a diff against nothing.
      saveTemplateMutation.mutate({ template, wire: { kind: 'create' } });
      return;
    }

    // Only the changed keys — a full upsert would let a stale local copy of an untouched field
    // overwrite a newer write to it from elsewhere. fieldGroups isn't a column here anymore
    // (useFieldGroups.tsx) — never diffed or sent.
    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(currentChecklistTemplate) as (keyof ChecklistTemplate)[]) {
      if (key === 'id' || key === 'fieldGroups') continue;
      if (JSON.stringify(template[key]) !== JSON.stringify(existing[key])) {
        changes[key] = template[key];
      }
    }

    saveTemplateMutation.mutate({
      template,
      wire: Object.keys(changes).length > 0 ? { kind: 'patch', changes } : { kind: 'none' },
    });
  };

  const deleteChecklistTemplate = (id: string) => {
    removeTemplateMutation.mutate(id);
    deselectChecklistTemplate(id);
  };

  /** Sets (or clears, `null`) the *caller's own* reminder — safe even for a template the caller
   * doesn't own (a challenge participant following their own day/time). Always re-fetches
   * afterward instead of trusting the local store: clearing needs the server's own
   * fallback-to-owner value, which nothing on this device has a copy of. */
  const updateMyReminder = async (id: string, repeat: ChecklistTemplate['repeat'] | null) => {
    await patchChecklistTemplate(id, { repeat });
    const result = await fetchChecklistTemplateById(id);
    if (result) mergeTemplates(result.templates);
  };

  return { addChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, updateMyReminder };
}
