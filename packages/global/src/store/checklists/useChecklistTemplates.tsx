import { v4 } from 'uuid';
import React from 'react';
import { endOfDay, startOfDay } from 'date-fns';
import { useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { createSharedState } from '../../hook/createSharedState';
import { useSession } from '../../hook/useSession';
import { checklistLogsKeys } from '../checklist-logs/checklistLogsKeys';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import type { FieldOverrides } from '../record-field/useRecordField';
import { useFieldGroups } from './useFieldGroups';
import { checklistTemplatesKeys } from './checklistTemplatesKeys';

// Every backend call here is quiet: a failure resolves to null and this
// hook's own in-memory state is the fallback, unchanged.
import {
  fetchChecklistTemplateById,
  fetchChecklistTemplates,
  patchChecklistTemplate,
  removeChecklistTemplate as removeChecklistTemplateApi,
  saveChecklistTemplate,
} from './checklistTemplatesApi';

const SELECTED_CHECKLISTS_TEMPLATE_KEY = 'selected_checklist_templates';

/**
 * A field the group includes, plus whatever this group overrides about how it's shown/prefilled
 * — see FieldOverrides' own doc comment (useRecordField.tsx) for why this is a small named
 * subset rather than a full field fork. `overrides` absent (or empty) means "show this field
 * exactly as it is globally," same as before this existed.
 */
export type FieldGroupField = {
  fieldId: string;
  overrides?: FieldOverrides;
};

/**
 * `fields` (this group's own field-ids-plus-overrides list) is jsonb on the `field_groups` row —
 * see FieldGroup's own note below — so a group saved before this shipped still has `fields` as
 * plain `RecordField` id strings — this is the one normalizer every fetched group goes through
 * (useFieldGroups.tsx's own merge) so nothing downstream has to special-case the legacy shape.
 */
export const normalizeFieldGroupFields = (
  fields: (string | FieldGroupField)[] | undefined | null,
): FieldGroupField[] => (fields ?? []).map(f => (typeof f === 'string' ? { fieldId: f } : f));

/**
 * A real row in `field_groups` now (see 20260829010000_notes_note_id_ownership.sql), not jsonb
 * embedded in `checklist_templates.field_groups` — see useFieldGroups.tsx for the store this is
 * fetched/written through.
 */
export type FieldGroup = {
  id: string;
  checklistTemplateId: string;
  title: string;
  fields: FieldGroupField[];
  /** This group's own canonical (owner's) persistent note — see useFieldGroupNote.ts and
   * ChecklistFieldGroupView. Set the first time the owner actually writes into it; absent means
   * no note yet. A participant's own copy of it is a separate note entirely, not referenced here
   * — see useFieldGroupNote.ts's own comment. */
  noteId?: string;
  /** Explicit ordering among a template's own groups — the old jsonb array's position used to be
   * this. */
  position: number;
  defaultTab?: number;
  activeTabs?: number[];
  collapseDefault?: boolean;
  /**
   * Which day(s)/time this group is actually due — a "Gym" template can show a Push group
   * Mon/Thu and a Pull group Tue/Fri. Day/time only (no `dayOfMonth`/`month`/`startedAt` — those
   * live at the template level, where they're actually used). Absent, or `dayOfWeek: '*'`, means
   * "every day" — see scheduleUtils.ts's `isFieldGroupActiveOnDay`, which gates whether this
   * group renders on a given day. The template's own `repeat.dayOfWeek` is *derived* from the
   * union of every group's `dayOfWeek` when there are any field groups (scheduleUtils.ts's
   * `getEffectiveDayOfWeek`) rather than edited independently — otherwise a group could end up
   * scheduled for a day the template itself never generates a `Checklist` instance on, making it
   * silently unreachable.
   */
  repeat?: {
    hour: string;
    minute: string;
    dayOfWeek: string;
  };
  /**
   * Soft delete — set (to the deletion time) instead of actually deleting the row, by "Delete
   * Group" in the group's own settings menu (ChecklistFieldGroupMenu). There's no undo anywhere
   * else in this app (a write here is immediate and optimistic, same as everywhere), so this is
   * what makes a group's own title/schedule/fields recoverable at all after a delete, rather than
   * that config being gone the instant the request fires. Every consumer that renders or counts
   * "the template's groups" should go through `getActiveFieldGroups` (below) rather than reading
   * a fetched list directly, so an archived group doesn't silently reappear in a tab list, a
   * schedule union, or a group-name summary that forgot to filter it out.
   *
   * Restoring a group must send this as `null`, not `undefined` — `JSON.stringify` drops an
   * `undefined`-valued key entirely, so it would never even reach the `field-groups` POST body,
   * and `fromFieldGroup` (`_shared/fieldGroups.ts`) only writes `archived_at` from what's
   * actually present. `null` isn't dropped by `JSON.stringify`, so it reaches the row and
   * actually overwrites.
   */
  archivedAt?: string | null;
  updatedAt: string;
};

/** See `FieldGroup.archivedAt`'s own comment for why this exists instead of just removing the
 * array entry. */
export const getActiveFieldGroups = (fieldGroups: FieldGroup[]): FieldGroup[] =>
  fieldGroups.filter(group => !group.archivedAt);

/** Every archived group, most recently archived first — for a "restore" surface (see
 * ChecklistGenericInfo's Archived Groups row). */
export const getArchivedFieldGroups = (fieldGroups: FieldGroup[]): FieldGroup[] =>
  fieldGroups
    .filter(group => !!group.archivedAt)
    .sort((a, b) => (b.archivedAt as string).localeCompare(a.archivedAt as string));

/**
 * Merges an edited *active-only* group list (from an editor that was only ever shown the active
 * subset — see ScheduleModalContent's own use of this) back into the full array, matching by id
 * and leaving every archived group exactly as it was. `edited` is assumed to carry the same set
 * of ids as `getActiveFieldGroups(all)` — every editor that hands back an edited list here only
 * ever changes fields on the groups it was given, never adds or removes one.
 */
export const mergeEditedFieldGroups = (
  all: FieldGroup[],
  edited: FieldGroup[],
): FieldGroup[] => {
  const editedById = new Map(edited.map(group => [group.id, group]));
  return all.map(group => editedById.get(group.id) ?? group);
};

export type ChecklistTemplate = {
  id: string;
  title: string;
  repeat?: {
    minute: string;
    hour: string;
    dayOfMonth: string;
    month: string;
    dayOfWeek: string;
    startedAt: string;
    /**
     * The IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`, e.g.
     * `"Asia/Ho_Chi_Minh"`) of whichever device most recently wrote this schedule — stamped on
     * every write (see @dreamer/global's `getClientTimezone`, calculateRepeat.ts,
     * createTaskUtil.ts, ChecklistGenericInfo's handleSave* family) so `startedAt`/`endedAt`
     * stay interpretable as the calendar days the writer actually picked. Optional only because
     * a schedule written before this field existed has none.
     */
    timezone?: string;
    completedAt?: string;
    /**
     * The last day this schedule generates a `Checklist` instance on — symmetric with
     * `startedAt` (see getChecklistTemplateIdsByGivingDate's own gate below). Absent means "no
     * end date," the default for every template, matching how this behaved before this existed.
     */
    endedAt?: string;
    /**
     * Set only when this schedule is a challenge participant's own row, distinct from the
     * template owner's default (see 20260830000000_repeats_table.sql / _shared/repeats.ts's
     * `pickRepeat`) — never present for the owner's own view of their own template, since "my
     * schedule" and "the default" are the same thing there. A participant gets one of these
     * seeded from the owner's current schedule the moment they join (see
     * `challenge-participants/services/challenge-participants-service.ts`'s own
     * `seedReminderFromOwner`), not only once they've actually customized it — a fresh join looks
     * "personal" immediately, values matching the owner's or not. Absent (or `false`) means what's
     * here is the owner's own schedule (the viewer is the owner), or, for a participant who joined
     * before this seeding existed and never set their own, the owner's live schedule via
     * `pickRepeat`'s own fallback. Read-only, server-computed — never send this back on a write.
     */
    isPersonal?: boolean;
  };
  avatar: {
    type: string;
    name: string;
    color?: string;
  };
  createdAt: string;
  // @deprecated use groups instead
  records: string[];
  fieldGroups: FieldGroup[];
  tags: string[];
  visibility?: 'public' | 'private';
  /** One flag groups many templates ("Gym" for Push-ups + Pull-ups) — see packages/global/src/store/flag. */
  flagId?: string;
  /**
   * Lineage only, set once at fork time when this template was created by
   * joining a challenge (see useJoinChallenge.tsx) — never read for access
   * control.
   */
  copiedFromId?: string;
  updatedAt: string;
};

type ChecklistTemplatesMap = Record<string, ChecklistTemplate>;
// Per-entity rollback, not a whole-map snapshot — see useTags.tsx. Covers both caches a write
// touches (bulk "all mine" + this template's own per-id query).
type RollbackContext = {
  previousFromAll: ChecklistTemplate | undefined;
  previousFromId: ChecklistTemplate | undefined;
};
type SaveTemplateArgs = {
  template: ChecklistTemplate;
  wire: { kind: 'create' } | { kind: 'patch'; changes: Record<string, unknown> } | { kind: 'none' };
};

// Whether "all mine" has been requested this session — shared across every
// `useChecklistTemplates()` call (see createSharedState) so one component's own request is
// visible to every other instance, not just its own.
const useWantsAllTemplatesStore = createSharedState(false);

// Every template id ever resolved by id, kept even after `selectedChecklistTemplates` drops it
// (deselect/delete) — otherwise `useQueries` below stops observing that id's cache entry, and a
// rollback after a failed write has nothing left to notify. Shared for the same reason `wantsAll` is.
const useKnownTemplateIdsStore = createSharedState<string[]>([]);

// Dedup for `getChecklistTemplate`'s own byId bypass fetch — see its own comment.
const fetchedByIdScopes = new Set<string>();

async function fetchOneTemplate(id: string): Promise<ChecklistTemplate | null> {
  const result = await fetchChecklistTemplateById(id);
  if (!result) throw new Error('Failed to fetch checklist template');
  return result.templates[0] ?? null;
}

function writeTemplate(
  queryClient: QueryClient,
  key: readonly unknown[],
  template: ChecklistTemplate | null,
) {
  queryClient.setQueryData(key, template);
}

// Only writes if the bulk cache is actually loaded — a write shouldn't fabricate a "loaded" state
// for it if it was never fetched.
function writeTemplateIfPresent(
  queryClient: QueryClient,
  key: readonly unknown[],
  id: string,
  template: ChecklistTemplate | undefined,
) {
  queryClient.setQueryData<ChecklistTemplatesMap>(key, prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (template) next[id] = template;
    else delete next[id];
    return next;
  });
}

/**
 * Keeps the stored `repeat.dayOfWeek` in sync with the derived union of the template's own
 * field-group schedules (getEffectiveDayOfWeek). Gating itself never trusts this stored value
 * (see getChecklistTemplateIdsByGivingDate below) — this is only for the handful of consumers
 * that still read `repeat.dayOfWeek` directly for display (share cards, ChecklistToday's
 * "today's schedule" label), so those don't show a stale value once a group's own schedule
 * changes. Only touches `repeat` when one is already set on the template — a template with
 * field-group schedules but no template-level `repeat` at all has nothing to sync into, and the
 * derived gate works from the field groups either way.
 *
 * Only runs from `addChecklistTemplate`/`updateChecklistTemplate`, against whatever
 * `template.fieldGroups` the caller happened to pass in at that moment — since a group is its
 * own row now (see useFieldGroups.tsx), one added via `addFieldGroup` *after* this runs won't
 * retrigger this sync. Acceptable given the "display convenience only" note above (real gating
 * never reads this), but worth knowing if a share card/label ever looks stale right after adding
 * a group with its own schedule.
 */
function withSyncedRepeat(template: ChecklistTemplate): ChecklistTemplate {
  if (!template.repeat || !template.fieldGroups?.length) return template;
  const dayOfWeek = getEffectiveDayOfWeek(template);
  if (dayOfWeek === undefined || dayOfWeek === template.repeat.dayOfWeek) return template;
  return { ...template, repeat: { ...template.repeat, dayOfWeek } };
}

/**
 * One template by id, as a real query — for a single-id consumer (detail-task-page,
 * tasks-shared-page-ui, challenge-dashboard-page-ui) in place of
 * `useSyncedSelector(getChecklistTemplate, id)`. Own template or anyone's if `visibility: 'public'`.
 */
export const useChecklistTemplateDetail = (id: string | undefined) => {
  const { userId, ready } = useSession();
  const { getFieldGroups } = useFieldGroups();
  const { data, isLoading } = useQuery({
    queryKey: checklistTemplatesKeys.byId(id, userId),
    queryFn: () => fetchOneTemplate(id as string),
    enabled: ready && !!id,
    staleTime: Infinity,
  });

  const template = React.useMemo(
    () => (data ? { ...data, fieldGroups: getFieldGroups(data.id) } : undefined),
    [data, getFieldGroups],
  );

  return { template, isLoading };
};

export const useChecklistTemplates = () => {
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();

  const [selectedChecklistTemplates, setSelectedChecklist] = useLocalStorage<
    string[]
  >(SELECTED_CHECKLISTS_TEMPLATE_KEY, []);
  const invalidateChecklistLogs = () => queryClient.invalidateQueries({ queryKey: checklistLogsKeys.all });

  // `field-groups` isn't a column on this row anymore — `getChecklistTemplate`/
  // `getRecommendChecklistTemplates` merge `getFieldGroups(id)` onto the object they return.
  const { getFieldGroups, ensureAllFieldGroupsFetched } = useFieldGroups();

  // "All mine" — lazy, enabled once `ensureAllTemplatesFetched` is called. Also true synchronously
  // whenever there's already a selected template: `setWantsAll(true)` only becomes visible on the
  // *next* render, one render too late to stop this render's own per-id queries below from firing
  // in parallel with the bulk fetch — `selectedChecklistTemplates` (from useLocalStorage) is
  // available immediately, so ORing it in closes that gap for the common "returning user, already
  // has selected templates" case.
  const [wantsAllRequested, setWantsAll] = useWantsAllTemplatesStore();
  const wantsAll = wantsAllRequested || selectedChecklistTemplates.length > 0;
  const allKey = checklistTemplatesKeys.all(userId);
  const {
    data: allTemplates,
    isLoading: allTemplatesLoading,
  } = useQuery<ChecklistTemplatesMap>({
    queryKey: allKey,
    queryFn: async () => {
      const result = await fetchChecklistTemplates();
      if (!result) throw new Error('Failed to fetch checklist templates');
      const map: ChecklistTemplatesMap = {};
      for (const template of result.templates) map[template.id] = template;
      return map;
    },
    enabled: ready && wantsAll,
    staleTime: Infinity,
  });

  const ensureAllTemplatesFetched = React.useCallback(() => setWantsAll(true), [setWantsAll]);

  // `!wantsAll` matters: a disabled query reads `isLoading: false`, which would flash a wrong
  // "done loading" for the one render before `ensureAllTemplatesFetched` flips `wantsAll` true.
  const templatesLoading = !wantsAll || allTemplatesLoading;

  const [knownTemplateIds, setKnownTemplateIds] = useKnownTemplateIdsStore();
  const markTemplateIdKnown = React.useCallback(
    (id: string) => setKnownTemplateIds(prev => (prev.includes(id) ? prev : [...prev, id])),
    [setKnownTemplateIds],
  );
  const observedTemplateIds = React.useMemo(
    () => Array.from(new Set([...selectedChecklistTemplates, ...knownTemplateIds])),
    [selectedChecklistTemplates, knownTemplateIds],
  );

  // One real query per observed template — `useQueries` since the id list is dynamic (can't call
  // useChecklistTemplateDetail in a loop). Waits for "all mine" to actually settle before
  // deciding whether an id needs its own fetch (not just `wantsAll` being true) — otherwise every
  // observed id fires its own request the instant "all mine" is requested, in parallel with the
  // bulk fetch that would have covered it a moment later. Only fires for real once settled and
  // still missing: a joined challenge's template, which "all mine" (own templates only) never has.
  const byIdResults = useQueries({
    queries: observedTemplateIds.map(id => ({
      queryKey: checklistTemplatesKeys.byId(id, userId),
      queryFn: () => fetchOneTemplate(id),
      enabled: ready && (!wantsAll || (!allTemplatesLoading && !allTemplates?.[id])),
      staleTime: Infinity,
    })),
  });

  // "All mine" plus whatever the per-id queries resolved — real subscriptions, so this stays
  // correct without a manual sync effect.
  const checklistTemplate = React.useMemo(() => {
    const map: ChecklistTemplatesMap = { ...allTemplates };
    byIdResults.forEach((result, index) => {
      const id = observedTemplateIds[index];
      if (result.data) map[id] = result.data;
    });
    return map;
  }, [allTemplates, byIdResults, observedTemplateIds]);

  // Shared by `updateMyReminder` below and by external callers that obtain a `ChecklistTemplate`
  // from an entirely different fetch path (useJoinChallenge.tsx's own accept-a-shared-template
  // flow) — seeds this template's own per-id cache so a later `getChecklistTemplate`/
  // `useChecklistTemplateDetail` call for it doesn't need its own fetch, and adds it to
  // `selectedChecklistTemplates` if this is the first time this device has seen it (always to the
  // known-ids list too, so it stays observed even if later deselected/deleted).
  const mergeTemplates = React.useCallback(
    (fetched: ChecklistTemplate[]) => {
      if (!fetched.length) return;
      const newIds: string[] = [];
      for (const template of fetched) {
        markTemplateIdKnown(template.id);
        const key = checklistTemplatesKeys.byId(template.id, userId);
        // "Existing" checks both the bulk cache and this template's own per-id slot — an owned
        // template already covered by "all mine" counts as known even if nothing has populated
        // its individual byId cache yet, matching the single shared map's own semantics before
        // this redesign (one map, so "known via any fetch path" was automatically one check).
        const existing = allTemplates?.[template.id] ?? queryClient.getQueryData<ChecklistTemplate | null>(key);
        // `>=`, not `>`: a repeat-only write (seeded at join time) doesn't bump `updatedAt`.
        if (!existing || new Date(template.updatedAt) >= new Date(existing.updatedAt)) {
          queryClient.setQueryData(key, template);
        }
        if (!existing) newIds.push(template.id);
      }

      // A newly-known template needs to be selected too, or it won't show on the calendar.
      if (newIds.length) {
        setSelectedChecklist(prev => {
          const additions = Array.from(new Set(newIds)).filter(id => !prev.includes(id));
          return additions.length ? [...prev, ...additions] : prev;
        });
      }
    },
    [queryClient, userId, allTemplates, setSelectedChecklist, markTemplateIdKnown],
  );

  // Per-entity rollback (see useTags.tsx's saveTagMutation). Only a real create invalidates
  // checklist-logs. Writes both caches — a write here is always the caller's own template, so
  // it's always safe to reflect in "all mine" too.
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
    currentChecklistTemplate: Omit<ChecklistTemplate, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
    },
    keepId = false,
  ) => {
    const id =
      keepId && currentChecklistTemplate.id
        ? currentChecklistTemplate.id
        : v4();
    const template: ChecklistTemplate = withSyncedRepeat({
      ...currentChecklistTemplate,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    updateSelectedChecklistTemplate(prev => [...prev, id]);
    // Optimistic — the caller gets `id` back immediately, before this
    // resolves, same as every other write in this app. `saved` is exposed
    // alongside it for the rare caller that references this id from
    // *another table's* row before this one has necessarily landed
    // server-side (useJoinChallenge.tsx forking a template then immediately
    // inserting a challenge_participants row whose checklist_template_id
    // has a real FK to this table — awaiting `saved` there is what keeps
    // that insert from racing this row's own POST). Most callers can ignore
    // it; the local store is already up to date. Never rejects, even
    // though the underlying mutation can (and does, to trigger its own
    // rollback on failure) — matches every other quiet write here: a
    // caller that awaits `saved` shouldn't need a try/catch.
    const saved = saveTemplateMutation
      .mutateAsync({ template, wire: { kind: 'create' } })
      .catch(() => null);
    return {
      id,
      saved,
    };
  };

  const updateChecklistTemplate = (
    currentChecklistTemplate: Omit<ChecklistTemplate, 'createdAt' | 'updatedAt'>,
  ) => {
    const existing = checklistTemplate[currentChecklistTemplate.id];
    const template: ChecklistTemplate = withSyncedRepeat({
      ...existing,
      ...currentChecklistTemplate,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (!existing) {
      // Nothing on the server yet for this id — this is really a create,
      // so it needs the full row, not a diff against nothing.
      saveTemplateMutation.mutate({ template, wire: { kind: 'create' } });
      return;
    }

    // Only send the keys that actually changed — a full upsert here would
    // let this device's possibly-stale copy of an untouched field (say,
    // fieldGroups, while only editing a note) overwrite a newer write to
    // that field from elsewhere. See checklistTemplatesApi.ts. Compares and
    // sends `template` (post withSyncedRepeat), not the caller's raw
    // `currentChecklistTemplate`, so a `repeat.dayOfWeek` resynced from the
    // field groups above actually reaches the backend instead of only
    // updating local state.
    // fieldGroups isn't a column on this row anymore (see useFieldGroups.tsx) — a caller that
    // wants to change a group calls that store's own addFieldGroup/updateFieldGroup directly,
    // never through here.
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
    updateSelectedChecklistTemplate(prev => prev.filter(templateId => templateId !== id));
  };

  const updateSelectedChecklistTemplate = (
    update: string[] | ((prev: string[]) => string[]),
  ) => {
    // Dedupe here, once, rather than trusting every caller — this is the
    // single choke point every write to the list goes through (the
    // checkbox in checklist-template-page-ui, addChecklistTemplate above).
    // getChecklistTemplateIdsByGivingDate filters this list directly with
    // no dedup of its own, so a duplicate id here renders that template's
    // checklist more than once for the same day, everywhere it's read. This
    // also self-heals a list that already picked up a duplicate from an
    // older client build, rather than requiring the id to be manually
    // cleared out of localStorage.
    //
    // Takes an updater function (not just a plain array) so a caller never
    // has to build the next array from its own possibly-stale closure of
    // `selectedChecklistTemplates` — two near-simultaneous writes (a
    // double-submitted "add task") now always compose against the real
    // current value instead of racing and dropping one of the two ids.
    setSelectedChecklist(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      return Array.from(new Set(next));
    });
  };

  // `field-groups` is fetched/stored separately (see useFieldGroups.tsx) — every read function
  // below that hands back a `ChecklistTemplate` merges that store's own `getFieldGroups` onto it
  // here, once, so nothing downstream has to know the two ever lived in different places.
  const withFieldGroups = React.useCallback(
    (template: ChecklistTemplate): ChecklistTemplate => ({
      ...template,
      fieldGroups: getFieldGroups(template.id),
    }),
    [getFieldGroups],
  );

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `checklistTemplate`
  // itself changes, instead of on every render.
  const getRecommendChecklistTemplates = React.useCallback((): ChecklistTemplate[] => {
    ensureAllTemplatesFetched();
    ensureAllFieldGroupsFetched();
    return Object.values(checklistTemplate).map(withFieldGroups);
  }, [checklistTemplate, ensureAllTemplatesFetched, ensureAllFieldGroupsFetched, withFieldGroups]);

  const getChecklistTemplateIdsByGivingDate = React.useCallback(
    ({ date }: { date: Date } = { date: new Date() }) => {
      ensureAllTemplatesFetched();
      ensureAllFieldGroupsFetched();
      return selectedChecklistTemplates.filter(checklistTemplateId => {
        const raw = checklistTemplate[checklistTemplateId];
        const currentChecklistTemplate = raw && withFieldGroups(raw);

        // A schedule's startedAt is the day it takes effect from — a day-of-week
        // match before that date is the template's history, not a day it was
        // ever actually scheduled to appear on.
        const startedAt = currentChecklistTemplate?.repeat?.startedAt;
        if (startedAt && date < startOfDay(new Date(startedAt))) {
          return false;
        }

        // Symmetric with startedAt above — a schedule with an end date stops generating
        // instances after it, same "gate the day, not the recurrence rule itself" shape.
        const endedAt = currentChecklistTemplate?.repeat?.endedAt;
        if (endedAt && date > endOfDay(new Date(endedAt))) {
          return false;
        }

        // Derived from the field groups' own schedules when there are any —
        // never trust the template's stored `repeat.dayOfWeek` for gating,
        // since that's only kept in sync as a display convenience (see
        // withSyncedRepeat) and could in principle still be stale (an
        // externally-written row, an old client). See getEffectiveDayOfWeek.
        const effectiveDayOfWeek = getEffectiveDayOfWeek(currentChecklistTemplate ?? {});
        return (
          effectiveDayOfWeek?.split(',').includes(date.getDay().toString()) ||
          effectiveDayOfWeek === '*'
        );
      });
    },
    [selectedChecklistTemplates, checklistTemplate, ensureAllTemplatesFetched, ensureAllFieldGroupsFetched, withFieldGroups],
  );

  /**
   * Sets (or clears, passing `null`) the *caller's own* reminder schedule for a template —
   * always safe to call whether or not the caller owns it: a challenge participant uses this to
   * follow a different day/time than the owner's default, without needing a writable copy of
   * anything else about the template (see useJoinChallenge.tsx on why joining doesn't fork one).
   * The backend enforces this is scoped to the caller no matter what `id` is passed — see
   * checklist-templates/index.ts's own comment on `update()`.
   *
   * Unlike `updateChecklistTemplate`'s diff-against-local-copy shape, this always re-fetches
   * afterward instead of trusting the local store: clearing an override needs the server's own
   * fallback-to-the-owner's-schedule value, which nothing on this device ever had a copy of.
   */
  const updateMyReminder = async (id: string, repeat: ChecklistTemplate['repeat'] | null) => {
    await patchChecklistTemplate(id, { repeat });
    const result = await fetchChecklistTemplateById(id);
    if (result) mergeTemplates(result.templates);
  };

  /** One template by id — own, or anyone's if public. Prefers "all mine" once that covers this
   * id; falls back to a one-off fetch otherwise (not yet fetched, or a joined template "all mine"
   * never covers). Routed through `mergeTemplates`, not a bare cache write, so the id gets a real
   * `useQueries` observer — nothing else watches an arbitrary id ahead of time. */
  const getChecklistTemplate = React.useCallback(
    (id: string): ChecklistTemplate | undefined => {
      const scopeKey = `${userId}:${id}`;
      // Deliberately not gated on `allTemplatesLoading` the way the useQueries call above is:
      // this is a plain callback some callers invoke only once (e.g. from an effect with a
      // narrow dependency array), not a reactive subscription that automatically retries once
      // the bulk fetch settles. Waiting here would risk never fetching at all for those callers.
      // Firing one redundant request during the brief bulk-loading race is an acceptable
      // trade-off — this function is only ever called for one specific id at a time, never in a
      // loop over many templates, so it isn't the source of the N-parallel-request flood
      // `useQueries` above guards against.
      if (ready && id && !(wantsAll && allTemplates?.[id]) && !fetchedByIdScopes.has(scopeKey)) {
        fetchedByIdScopes.add(scopeKey);
        fetchOneTemplate(id)
          .then(template => {
            if (!template) {
              fetchedByIdScopes.delete(scopeKey);
              return;
            }
            mergeTemplates([template]);
          })
          .catch(() => {
            fetchedByIdScopes.delete(scopeKey);
          });
      }
      const template = checklistTemplate[id];
      return template && withFieldGroups(template);
    },
    [checklistTemplate, userId, ready, wantsAll, allTemplates, mergeTemplates, withFieldGroups],
  );

  return {
    checklistTemplate,
    templatesLoading,
    getChecklistTemplate,
    addChecklistTemplate,
    updateChecklistTemplate,
    updateMyReminder,
    deleteChecklistTemplate,
    selectedChecklistTemplates,
    updateSelectedChecklistTemplate,
    getRecommendChecklistTemplates,
    getChecklistTemplateIdsByGivingDate,
    // Exposed for the challenge join flow (checklist-template-shared-page-ui,
    // useResumePendingChallengeJoin): merging a shared template under its
    // own id — never forking a new one — is exactly this function, already
    // used internally by every scoped fetch above.
    mergeTemplates,
  };
};
