import React from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { createSharedState } from '../../hook/createSharedState';
import { useSession } from '../../hook/useSession';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { fetchChecklistTemplates } from './checklistTemplatesApi';
import { fetchOneTemplate } from './checklistTemplateFetch';
import type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';

const SELECTED_CHECKLISTS_TEMPLATE_KEY = 'selected_checklist_templates';

// Every template id ever resolved by id, kept even after `selectedChecklistTemplates` drops it
// (deselect/delete) — otherwise the per-id queries below stop observing it, and a rollback after
// a failed write has nothing left to notify. Shared across every `useChecklistTemplatesQuery()`
// instance (see createSharedState).
const useKnownTemplateIdsStore = createSharedState<string[]>([]);

/**
 * The read side of checklist-templates: the bulk "all mine" fetch, a real per-id query for every
 * template resolved outside it (a joined challenge's, mainly), and the merged map both feed —
 * see useChecklistTemplates.tsx, which composes this with the write side
 * (useChecklistTemplateMutations).
 */
export function useChecklistTemplatesQuery() {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();

  const [selectedChecklistTemplates, setSelectedChecklistTemplates] = useLocalStorage<string[]>(
    SELECTED_CHECKLISTS_TEMPLATE_KEY,
    [],
  );

  const allKey = checklistTemplatesKeys.all(userId);
  const {
    data: allTemplates,
    isLoading: allTemplatesLoading,
    isSuccess: allTemplatesSettled,
  } = useQuery<ChecklistTemplatesMap>({
    queryKey: allKey,
    queryFn: async () => {
      const result = await fetchChecklistTemplates();
      if (!result) throw new Error('Failed to fetch checklist templates');
      const map: ChecklistTemplatesMap = {};
      for (const template of result.templates) map[template.id] = template;
      return map;
    },
    enabled: ready,
    staleTime: Infinity,
  });

  const templatesLoading = !ready || allTemplatesLoading;

  const [knownTemplateIds, setKnownTemplateIds] = useKnownTemplateIdsStore();
  const markTemplateIdKnown = React.useCallback(
    (id: string) => setKnownTemplateIds(prev => (prev.includes(id) ? prev : [...prev, id])),
    [setKnownTemplateIds],
  );
  // Not `selectedChecklistTemplates` — that list is persisted and never pruned on delete, so an
  // orphaned id would otherwise get its own fetch forever, every page load.
  const observedTemplateIds = knownTemplateIds;

  // Waits for "all mine" to settle before firing its own fetch — otherwise every observed id
  // fires in parallel with the bulk fetch that was about to cover it a moment later. Only fires
  // for real once settled and still missing: a joined challenge's template, which "all mine"
  // (own templates only) never has.
  const byIdResults = useQueries({
    queries: observedTemplateIds.map(id => ({
      queryKey: checklistTemplatesKeys.byId(id, userId),
      queryFn: () => fetchOneTemplate(id),
      enabled: ready && allTemplatesSettled && !allTemplates?.[id],
      staleTime: Infinity,
    })),
  });

  const checklistTemplate = React.useMemo(() => {
    const map: ChecklistTemplatesMap = { ...allTemplates };
    byIdResults.forEach((result, index) => {
      const id = observedTemplateIds[index];
      if (result.data) map[id] = result.data;
    });
    return map;
  }, [allTemplates, byIdResults, observedTemplateIds]);

  const updateSelectedChecklistTemplate = (update: string[] | ((prev: string[]) => string[])) => {
    // Dedupes here, once — the single choke point every write to the list goes through — and
    // self-heals a list that already picked up a duplicate from an older client build.
    setSelectedChecklistTemplates(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      return Array.from(new Set(next));
    });
  };

  // The two actual operations every caller wants — "show this on my calendar" (a new template,
  // a challenge just joined) / "stop showing this" (deleted, left) — instead of each call site
  // hand-rolling its own add/remove-from-array logic against updateSelectedChecklistTemplate.
  const selectChecklistTemplate = (id: string) =>
    updateSelectedChecklistTemplate(prev => (prev.includes(id) ? prev : [...prev, id]));
  const deselectChecklistTemplate = (id: string) =>
    updateSelectedChecklistTemplate(prev => prev.filter(templateId => templateId !== id));

  // Seeds a template fetched some other way (useJoinChallenge.tsx's accept-a-shared-template
  // flow) so a later getChecklistTemplate/useChecklistTemplateDetail call doesn't need its own
  // fetch, and selects it if this device has never seen it before.
  const mergeTemplates = React.useCallback(
    (fetched: ChecklistTemplate[]) => {
      if (!fetched.length) return;
      const newIds: string[] = [];
      for (const template of fetched) {
        markTemplateIdKnown(template.id);
        const key = checklistTemplatesKeys.byId(template.id, userId);
        const existing = allTemplates?.[template.id] ?? queryClient.getQueryData<ChecklistTemplate | null>(key);
        // `>=`, not `>`: a repeat-only write (seeded at join time) doesn't bump `updatedAt`.
        if (!existing || new Date(template.updatedAt) >= new Date(existing.updatedAt)) {
          queryClient.setQueryData(key, template);
        }
        if (!existing) newIds.push(template.id);
      }
      // Same dedup `updateSelectedChecklistTemplate` does, inlined against `setSelectedChecklistTemplates`
      // directly rather than calling that (unmemoized) function — keeps this callback's own
      // identity stable across renders, which callers rely on (see getChecklistTemplate's deps).
      if (newIds.length) {
        setSelectedChecklistTemplates(prev => Array.from(new Set([...prev, ...newIds])));
      }
    },
    [queryClient, userId, allTemplates, setSelectedChecklistTemplates, markTemplateIdKnown],
  );

  // A template found here is definitely owned — lets getFieldGroups trust an empty "all mine"
  // field-groups result as a real zero instead of refetching (see its own `isOwned`).
  const isOwnedTemplate = React.useCallback((id: string) => !!allTemplates?.[id], [allTemplates]);

  return {
    userId,
    ready,
    queryClient,
    allKey,
    allTemplates,
    checklistTemplate,
    templatesLoading,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    isOwnedTemplate,
    mergeTemplates,
    markTemplateIdKnown,
  };
}
