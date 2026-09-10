import React from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { createSharedState } from '../../hook/createSharedState';
import { useSession } from '../../hook/useSession';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import { fetchChecklistTemplates } from './checklistTemplatesApi';
import { fetchOneTemplate } from './checklistTemplateFetch';
import type { ChecklistTemplatesMap } from './checklistTemplateTypes';

const SELECTED_CHECKLISTS_TEMPLATE_KEY = 'selected_checklist_templates';
// Every template id this device has ever reconciled into `selectedChecklistTemplates` — once, not
// repeatedly, so a deliberate deselect (the management page's own hide checkbox) sticks instead of
// being fought on every reload. Distinct from `selectedChecklistTemplates` itself: an id can leave
// that list (hidden, or genuinely deleted) while staying in this one forever, which is exactly what
// stops it from being treated as "new" again. See the reconciliation effect below for why this
// exists at all.
const SEEN_CHECKLIST_TEMPLATE_KEY = 'seen_checklist_template_ids';

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
  // The other half of markTemplateIdKnown — a template this device deliberately removed
  // (deleteChecklistTemplate: deleted outright, or a challenge left) must stop being "known,"
  // or the per-id fallback query below re-enables itself the moment the bulk "all mine" fetch
  // no longer carries it (exactly what it's *supposed* to do for a template genuinely missing
  // from "all mine") and re-fetches it by id — which still resolves for a shared challenge
  // template (visibility stays 'public' after leaving), silently undoing the removal for every
  // consumer reading `checklistTemplate` instead of `allTemplates` (checklist-template-page-ui's
  // own management list, notably).
  const unmarkTemplateIdKnown = React.useCallback(
    (id: string) => setKnownTemplateIds(prev => prev.filter(knownId => knownId !== id)),
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

  const [seenTemplateIds, setSeenTemplateIds] = useLocalStorage<string[]>(SEEN_CHECKLIST_TEMPLATE_KEY, []);
  // `selectedChecklistTemplates` only ever gains an id at the exact moment a template is created
  // or a challenge is joined *on this device* (addChecklistTemplate/useJoinChallenge) — nothing
  // ever reconciles it against the server afterward. `signOut` explicitly wipes it (SYNCED_DATA_KEYS,
  // useSession.ts), and it was never populated at all on a second device signing into an existing
  // account either way — both leave every real template (owned or joined) server-confirmed but
  // invisible on the calendar, with no way to notice short of a manual localStorage edit. This
  // self-heals it: the first time this device ever sees a template id in its own "all mine" fetch
  // (own or joined — both are server truth by the time they land here), select it once. `seenTemplateIds`
  // is what makes this a *one-time* catch-up rather than fighting a deliberate hide: an id already
  // marked seen is never auto-reselected again, even after the user deselects it.
  React.useEffect(() => {
    if (!allTemplates) return;
    const unseenIds = Object.keys(allTemplates).filter(id => !seenTemplateIds.includes(id));
    if (unseenIds.length === 0) return;
    setSeenTemplateIds(prev => Array.from(new Set([...prev, ...unseenIds])));
    updateSelectedChecklistTemplate(prev => Array.from(new Set([...prev, ...unseenIds])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTemplates, seenTemplateIds, setSeenTemplateIds]);

  // Not mere presence in `allTemplates` — that map holds both owned and joined-challenge templates
  // now (listOwnedAndJoinedTemplates), so presence alone can't tell them apart. `isOwner` is a
  // real, server-set field (toChecklistTemplate) for exactly this — used to tell "my own task"
  // from "one I joined" wherever that distinction matters (TaskDetailModal's edit/delete gating,
  // useTaskDetailModalData.ts's Schedule-vs-My-Reminder choice).
  const isOwnedTemplate = React.useCallback((id: string) => !!allTemplates?.[id]?.isOwner, [allTemplates]);

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
    markTemplateIdKnown,
    unmarkTemplateIdKnown,
  };
}
