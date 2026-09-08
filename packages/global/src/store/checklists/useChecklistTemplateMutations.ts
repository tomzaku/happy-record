import { v4 } from 'uuid';
import { subDays, endOfDay } from 'date-fns';
import { useMutation, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { checklistLogsKeys } from '../checklist-logs/checklistLogsKeys';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';
import {
  patchChecklistTemplate,
  removeChecklistTemplate as removeChecklistTemplateApi,
  saveChecklistTemplate,
} from './checklistTemplatesApi';
import { deleteOccurrence as deleteOccurrenceApi, restoreOccurrence as restoreOccurrenceApi } from './scheduleExceptionsApi';
import type { ChecklistTemplate, ChecklistTemplatesMap } from './checklistTemplateTypes';
import type { Checklist } from './useChecklists';

type RollbackContext = {
  previousFromAll: ChecklistTemplate | undefined;
  previousFromId: ChecklistTemplate | undefined;
};
type SaveTemplateArgs = {
  template: ChecklistTemplate;
  wire: { kind: 'create' } | { kind: 'patch'; changes: Record<string, unknown> } | { kind: 'none' };
  // Only ever set alongside `wire.kind === 'create'` — see addChecklistTemplate's own `seedChecklist`
  // param, threaded through to saveChecklistTemplate so the server seeds this in the same request.
  seedChecklist?: Checklist;
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

// Keeps `repeat.byday` in sync with field-group schedules, for display-only consumers (share
// cards, ChecklistToday's label) — real gating always derives it fresh, never trusts this.
function withSyncedRepeat(template: ChecklistTemplate): ChecklistTemplate {
  if (!template.repeat || !template.fieldGroups?.length) return template;
  const byday = getEffectiveDayOfWeek(template);
  if (byday === undefined || byday === template.repeat.byday) return template;
  return { ...template, repeat: { ...template.repeat, byday } };
}

// Adds/removes one date from `repeat.exceptionDates` — fully deterministic (unlike
// `updateMyReminder`'s own clear-to-null-then-fallback-to-owner case, there's no server-computed
// value the client doesn't already know), so this is the actual optimistic write, not just a
// placeholder pending a refetch. Drops the key entirely rather than leaving `exceptionDates: []`,
// same "absent means none" convention `toRepeat` itself already writes.
function withExceptionDate(template: ChecklistTemplate, date: string, present: boolean): ChecklistTemplate {
  if (!template.repeat) return template;
  const current = template.repeat.exceptionDates ?? [];
  const next = present ? (current.includes(date) ? current : [...current, date].sort()) : current.filter(d => d !== date);
  const { exceptionDates: _drop, ...restRepeat } = template.repeat;
  return { ...template, repeat: next.length > 0 ? { ...restRepeat, exceptionDates: next } : restRepeat };
}

type Deps = {
  userId: string | undefined;
  queryClient: QueryClient;
  allKey: QueryKey;
  checklistTemplate: ChecklistTemplatesMap;
  markTemplateIdKnown: (id: string) => void;
  selectChecklistTemplate: (id: string) => void;
  deselectChecklistTemplate: (id: string) => void;
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
}: Deps) {
  const invalidateChecklistLogs = () => queryClient.invalidateQueries({ queryKey: checklistLogsKeys.all });

  // Per-entity rollback (see useTags.tsx). Writes both caches — a write here is always the
  // caller's own template, safe to reflect in "all mine" too.
  const saveTemplateMutation = useMutation<{ ok: true }, Error, SaveTemplateArgs, RollbackContext>({
    mutationFn: async ({ template, wire, seedChecklist }) => {
      if (wire.kind === 'none') return { ok: true };
      const result =
        wire.kind === 'create'
          ? seedChecklist
            ? await saveChecklistTemplate(template, seedChecklist)
            : await saveChecklistTemplate(template)
          : await patchChecklistTemplate(template.id, wire.changes);
      if (!result) throw new Error('Failed to save checklist template');
      return result;
    },
    onMutate: async ({ template }) => {
      const idKey = checklistTemplatesKeys.byId(template.id, userId);
      const previousFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[template.id];
      const previousFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      // Before the awaits below: a caller's own synchronous checklist-store write
      // (createTaskUtil.ts) can otherwise render before this template lands.
      writeTemplateIfPresent(queryClient, allKey, template.id, template);
      writeTemplate(queryClient, idKey, template);
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      // After the write above, not before — marking a template "known" can flush a re-render of
      // byIdResults (useChecklistTemplatesQuery.ts) before idKey's cache actually has data.
      markTemplateIdKnown(template.id);
      return { previousFromAll, previousFromId };
    },
    onSuccess: (_result, { template, wire }) => {
      if (wire.kind !== 'create') return;
      invalidateChecklistLogs();
      // The POST response is just `{ ok: true }` — refetch "all mine" so the real, DTO-mapped row
      // (never carrying `isClient`) replaces this optimistic one.
      queryClient.invalidateQueries({ queryKey: allKey });
      // Also drop the stale per-id cache — checklistTemplate's merge (useChecklistTemplatesQuery.ts)
      // otherwise lets it win over the freshly-refetched row above, so `isClient` never clears.
      queryClient.removeQueries({ queryKey: checklistTemplatesKeys.byId(template.id, userId), exact: true });
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

  // Skips/restores one calendar day of a template's own schedule (`schedule_exceptions`) — see
  // deleteOccurrence/restoreOccurrence below. Genuinely optimistic (unlike updateMyReminder's own
  // invalidate-and-refetch): `withExceptionDate` already computes the exact resulting
  // `exceptionDates`, so there's nothing to wait on a round-trip for. Same per-entity rollback
  // shape as saveTemplateMutation above, on both caches — reached from the home list's own
  // bulk-query-backed `checklistTemplate` (ChecklistDay.desktop.tsx) as well as
  // detail-task-page's by-id one.
  const exceptionMutation = useMutation<
    { ok: true } | null,
    Error,
    { id: string; date: string; present: boolean },
    RollbackContext
  >({
    mutationFn: ({ id, date, present }) => (present ? deleteOccurrenceApi(id, date) : restoreOccurrenceApi(id, date)),
    onMutate: async ({ id, date, present }) => {
      const idKey = checklistTemplatesKeys.byId(id, userId);
      const previousFromAll = queryClient.getQueryData<ChecklistTemplatesMap>(allKey)?.[id];
      const previousFromId = queryClient.getQueryData<ChecklistTemplate | null>(idKey) ?? undefined;
      // Before the awaits below: a caller's own synchronous `deleteChecklist` (ChecklistToday)
      // can otherwise render before `exceptionDates` lands, synthesizing a phantom row for today.
      if (previousFromAll) writeTemplateIfPresent(queryClient, allKey, id, withExceptionDate(previousFromAll, date, present));
      if (previousFromId) writeTemplate(queryClient, idKey, withExceptionDate(previousFromId, date, present));
      await queryClient.cancelQueries({ queryKey: allKey });
      await queryClient.cancelQueries({ queryKey: idKey });
      return { previousFromAll, previousFromId };
    },
    onError: (_error, { id }, context) => {
      const idKey = checklistTemplatesKeys.byId(id, userId);
      writeTemplateIfPresent(queryClient, allKey, id, context?.previousFromAll);
      writeTemplate(queryClient, idKey, context?.previousFromId ?? null);
    },
  });

  /** `seedChecklist`, when given, rides along in the *same* `POST /checklist-templates` request
   * (see checklistTemplatesApi.ts's own `saveChecklistTemplate` and the edge function's own
   * comment) — only createTaskUtil.ts's one-off task creation flow uses this, to seed that task's
   * single Checklist instance without a second client round-trip racing this template's own FK.
   * This function only ever handles the *template*-side optimistic write and network call; the
   * caller is still responsible for its own local `checklist` store update (see
   * useChecklists.tsx's `addChecklist`, called with `{ skipNetwork: true }` for this exact case —
   * the network side already happened here). */
  const addChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
    keepId = false,
    seedChecklist?: Checklist,
  ) => {
    const id = keepId && currentChecklistTemplate.id ? currentChecklistTemplate.id : v4();
    const template: ChecklistTemplate = withSyncedRepeat({
      ...currentChecklistTemplate,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Cleared the moment the real row lands — see saveTemplateMutation's own `onSuccess` above.
      isClient: true,
    });
    selectChecklistTemplate(id);
    // Optimistic — `saved` lets a rare caller (useJoinChallenge.tsx forking a template then
    // inserting a challenge_participants row with a real FK to it) await the write landing before
    // racing a dependent insert. Never rejects, same as every other quiet write here.
    const saved = saveTemplateMutation
      .mutateAsync({ template, wire: { kind: 'create' }, seedChecklist })
      .catch(() => null);
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

  /** "Edit this and following events" — Google Calendar's series split. The original keeps
   * whatever it already had, just capped to end the day before `effectiveFrom`; a brand new,
   * independent template picks up from `effectiveFrom` with `newRepeat`, linked back via
   * `splitFromId` for lineage only (nothing occurrence-matching reads it). Modeled as two
   * ordinary templates, each with the one `schedules` row it already always has, rather than
   * multiple schedule rows for one owner — see the `checklist_templates_split_from_id` migration's
   * own comment on why (`schedules.id` is deterministic per (owner, user), so a second row for the
   * same template can't exist without reworking that). No FK ordering to race here (unlike
   * `addChecklistTemplate`'s own `saved` guard for a *dependent* insert) — the new template only
   * references the original's already-persisted id, never the other way around. Existing
   * `Checklist` instances before `effectiveFrom` stay on the original template untouched; ones
   * from `effectiveFrom` on are generated fresh against the new template by the existing
   * synthesis path (useChecklists.tsx) — nothing to migrate. */
  const splitChecklistTemplate = (
    original: ChecklistTemplate,
    effectiveFrom: string,
    newRepeat: NonNullable<ChecklistTemplate['repeat']>,
  ) => {
    updateChecklistTemplate({
      ...original,
      repeat: { ...original.repeat, until: endOfDay(subDays(new Date(effectiveFrom), 1)).toISOString() },
    });
    return addChecklistTemplate({
      title: original.title,
      avatar: original.avatar,
      records: [],
      fieldGroups: [],
      tags: original.tags,
      repeat: { ...newRepeat, startedAt: effectiveFrom },
      splitFromId: original.id,
    });
  };

  const deleteChecklistTemplate = (id: string) => {
    removeTemplateMutation.mutate(id);
    deselectChecklistTemplate(id);
  };

  /** Sets (or clears, `null`) the *caller's own* reminder — safe even for a template the caller
   * doesn't own (a challenge participant following their own day/time). Invalidates rather than
   * fetching and merging a fresh copy by hand: clearing needs the server's own
   * fallback-to-owner value, which nothing on this device has a copy of, and the page that called
   * this (detail-task-page, via useChecklistTemplateDetail) already has a live query on this
   * exact id that refetches itself once invalidated. */
  const updateMyReminder = async (id: string, repeat: ChecklistTemplate['repeat'] | null) => {
    await patchChecklistTemplate(id, { repeat });
    queryClient.invalidateQueries({ queryKey: checklistTemplatesKeys.byId(id, userId) });
  };

  /** Google Calendar's "delete this event" for a single occurrence of a recurring series — see
   * exceptionMutation above for the actual optimistic write. Never rejects, same quiet-write
   * convention as addChecklistTemplate's own `saved`. */
  const deleteOccurrence = (id: string, date: string) =>
    exceptionMutation.mutateAsync({ id, date, present: true }).catch(() => null);

  const restoreOccurrence = (id: string, date: string) =>
    exceptionMutation.mutateAsync({ id, date, present: false }).catch(() => null);

  return {
    addChecklistTemplate,
    updateChecklistTemplate,
    splitChecklistTemplate,
    deleteChecklistTemplate,
    updateMyReminder,
    deleteOccurrence,
    restoreOccurrence,
  };
}
