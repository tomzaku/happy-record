import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { v4 } from 'uuid';
import {
  fetchFieldGroupCompletions,
  removeFieldGroupCompletion as removeApi,
  saveFieldGroupCompletion,
} from './fieldGroupCompletionsApi';
import { fieldGroupCompletionsKeys } from './fieldGroupCompletionsKeys';

/**
 * A plain check/uncheck marker for one field group on one day's checklist — the
 * `Checklist.completedAt` idea (see that field's own comment) scoped one level down, for a
 * sub-task with no fields of its own to submit against. ChecklistFieldGroup's own done-indicator
 * reads this for a fields-empty group instead of deriving "done" from today's checklist_records
 * the way a field-bearing group does (useFieldGroupAccordion's own hasSubmittedToday).
 */
export type FieldGroupCompletion = {
  id: string;
  checklistId: string;
  fieldGroupId: string;
  completedAt: string;
  updatedAt: string;
};

type CompletionsByGroup = Record<string, FieldGroupCompletion>;
// Stable reference for useQuery's own `data` fallback — see useRecordField.tsx's
// EMPTY_FIELDS_MAP for why an inline `{}` literal here is a real infinite-render-loop risk once
// something downstream memoizes against this map's identity.
const EMPTY_COMPLETIONS: CompletionsByGroup = {};

// Scoped to the one completion being written, not a whole-map snapshot — see useFlag.tsx's own
// RollbackContext for why a global snapshot isn't safe under concurrent writes.
type RollbackContext = { previous: FieldGroupCompletion | undefined };

export const useFieldGroupCompletions = (checklistId: string | undefined) => {
  const queryClient = useQueryClient();
  const queryKey = React.useMemo(() => fieldGroupCompletionsKeys.list(checklistId), [checklistId]);

  const { data: completions = EMPTY_COMPLETIONS } = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await fetchFieldGroupCompletions(checklistId!);
      if (!result) throw new Error('Failed to fetch field group completions');
      const map: CompletionsByGroup = {};
      for (const completion of result.fieldGroupCompletions) map[completion.fieldGroupId] = completion;
      return map;
    },
    enabled: !!checklistId,
    staleTime: Infinity,
  });

  const setCompletionMutation = useMutation<{ ok: true }, Error, FieldGroupCompletion, RollbackContext>({
    mutationFn: async completion => {
      const result = await saveFieldGroupCompletion(completion);
      if (!result) throw new Error('Failed to save field group completion');
      return result;
    },
    onMutate: async completion => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CompletionsByGroup>(queryKey)?.[completion.fieldGroupId];
      queryClient.setQueryData<CompletionsByGroup>(queryKey, prev => ({
        ...prev,
        [completion.fieldGroupId]: completion,
      }));
      return { previous };
    },
    onError: (_error, completion, context) => {
      queryClient.setQueryData<CompletionsByGroup>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        if (context?.previous) next[completion.fieldGroupId] = context.previous;
        else delete next[completion.fieldGroupId];
        return next;
      });
    },
  });

  const removeCompletionMutation = useMutation<{ ok: true }, Error, FieldGroupCompletion, RollbackContext>({
    mutationFn: async completion => {
      const result = await removeApi(completion.id);
      if (!result) throw new Error('Failed to remove field group completion');
      return result;
    },
    onMutate: async completion => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CompletionsByGroup>(queryKey)?.[completion.fieldGroupId];
      queryClient.setQueryData<CompletionsByGroup>(queryKey, prev => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[completion.fieldGroupId];
        return next;
      });
      return { previous };
    },
    onError: (_error, completion, context) => {
      if (!context?.previous) return;
      const restored = context.previous;
      queryClient.setQueryData<CompletionsByGroup>(queryKey, prev => ({
        ...prev,
        [completion.fieldGroupId]: restored,
      }));
    },
  });

  const isFieldGroupComplete = React.useCallback(
    (fieldGroupId: string) => !!completions[fieldGroupId],
    [completions],
  );

  const toggleFieldGroupCompletion = React.useCallback(
    (fieldGroupId: string) => {
      if (!checklistId) return;
      const existing = completions[fieldGroupId];
      if (existing) {
        removeCompletionMutation.mutate(existing);
      } else {
        const now = new Date().toISOString();
        setCompletionMutation.mutate({ id: v4(), checklistId, fieldGroupId, completedAt: now, updatedAt: now });
      }
    },
    [checklistId, completions, removeCompletionMutation, setCompletionMutation],
  );

  return { isFieldGroupComplete, toggleFieldGroupCompletion };
};
