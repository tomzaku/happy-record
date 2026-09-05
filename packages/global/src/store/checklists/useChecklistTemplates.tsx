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
// Scoped to the one template being written, not a whole-map snapshot — see useTags.tsx's own
// comment (same fix, same resource shape) for why a global snapshot isn't safe under concurrent
// writes. Rollback restores it into whichever cache(s) it came from — the bulk "all mine" query
// (if loaded) and this template's own per-id query, mirroring useFieldGroups.tsx's own dual-write
// shape.
type RollbackContext = {
  previousFromAll: ChecklistTemplate | undefined;
  previousFromId: ChecklistTemplate | undefined;
};
type SaveTemplateArgs = {
  template: ChecklistTemplate;
  wire: { kind: 'create' } | { kind: 'patch'; changes: Record<string, unknown> } | { kind: 'none' };
};

// Whether "all mine" has been requested at all this session — shared across every
// `useChecklistTemplates()` call (see useFieldGroups.tsx's own `useWantsAllFieldGroupsStore` for
// why a plain per-component useState can't do this: this hook is called independently by many
// components, and a local flag would leave, say, detail-task-page's own instance blind to the
// home page already having requested the bulk fetch).
const useWantsAllTemplatesStore = createSharedState(false);

// Every template id this device has ever resolved by id (own or joined), regardless of whether
// it's currently in `selectedChecklistTemplates` — deliberately a separate, monotonically-growing
// list rather than reusing `selectedChecklistTemplates` itself, and shared (not per-component
// state) for the same reason `wantsAll` is. `selectedChecklistTemplates` is a genuine UI
// preference that legitimately shrinks (deselecting a template, deleting one) — but shrinking it
// would otherwise silently drop the `useQueries` observer this hook's own exposed `checklistTemplate`
// map depends on for that id, making a value React Query still has cached (e.g. a delete's own
// optimistic write, rolled back after a failure) invisible forever, with nothing left watching
// that query key to reflect the rollback. The old shared-cache-entry design never had this
// problem (one `useQuery` observed the *entire* map, so `selectedChecklistTemplates` and
// `checklistTemplate`'s own reactivity were completely independent, same as this list restores).
const useKnownTemplateIdsStore = createSharedState<string[]>([]);

// Dedup for `getChecklistTemplate`'s own byId bypass fetch — module-level (not per-render) since
// there's no live query observer for an id outside the known-ids list (see above) to dedupe
// against otherwise (see `getChecklistTemplate`'s own comment on why this can't just be
// `queryClient.ensureQueryData`'s built-in dedup alone: populating the cache with no observer
// watching that key doesn't trigger a re-render on its own — `mergeTemplates` adding the id to
// the known-ids list is what actually gives it one, and that only needs to happen once).
const fetchedByIdScopes = new Set<string>();

async function fetchOneTemplate(id: string): Promise<ChecklistTemplate | null> {
  const result = await fetchChecklistTemplateById(id);
  if (!result) throw new Error('Failed to fetch checklist template');
  return result.templates[0] ?? null;
}

// Writes unconditionally — creates the cache entry from nothing if it didn't exist yet. Used for
// the per-id query most directly relevant to whoever's making a given write.
function writeTemplate(
  queryClient: QueryClient,
  key: readonly unknown[],
  template: ChecklistTemplate | null,
) {
  queryClient.setQueryData(key, template);
}

// Writes only if the cache already holds real data — used for the bulk "all mine" query, which a
// write shouldn't silently fabricate a "loaded" state for if it was never actually fetched.
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
 * One template by its own id, as a real per-scope query — this is what a single-id consumer
 * (detail-task-page, tasks-shared-page-ui, challenge-dashboard-page-ui) should call directly, in
 * place of the old `useSyncedSelector(getChecklistTemplate, id)` pattern. Own template or
 * anyone's if `visibility: 'public'` (the shared/joined-challenge lookup — see
 * fetchChecklistTemplateById's own comment), same as the plain `getChecklistTemplate` callback
 * below; this is just the real-hook shape of the same read, mirroring
 * useFieldGroups.tsx's own `useFieldGroupsForTemplate`.
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

  // `field-groups` is its own resource now (see useFieldGroups.tsx) — a fetched template here
  // never carries real `fieldGroups` from the server anymore. `getChecklistTemplate`/
  // `getRecommendChecklistTemplates` below merge that store's own `getFieldGroups(id)` onto the
  // object they return, always fresh (a real per-scope React Query read, not a copy synced by an
  // effect) — a consumer that wants a template's current groups calls one of those, or
  // `getFieldGroups`/`useFieldGroupsForTemplate` directly, rather than reading `.fieldGroups` off
  // whatever's cached on the template object itself (which, unlike everything else on
  // `ChecklistTemplate`, isn't actually a column on this row anymore).
  const { getFieldGroups, ensureAllFieldGroupsFetched } = useFieldGroups();

  // "All mine" — lazy: stays disabled until `ensureAllTemplatesFetched` is actually called (the
  // management screen, or the home page's own schedule-matching loop), same "don't fetch until
  // actually needed" rule the old fetchedScopes Set enforced, now via `enabled` instead. Shared
  // across every `useChecklistTemplates()` call — see `useWantsAllTemplatesStore`'s own comment.
  const [wantsAll, setWantsAll] = useWantsAllTemplatesStore();
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

  /** Every template across every one of the caller's templates, unscoped — see
   * getChecklistTemplateIdsByGivingDate's own need for this. */
  const ensureAllTemplatesFetched = React.useCallback(() => setWantsAll(true), [setWantsAll]);

  // Starts `true` (before "all mine" has even been requested) and flips `false` only once it's
  // both been requested *and* settled — a plain `allTemplatesLoading` alone would read `false`
  // while `wantsAll` is still `false` (a disabled query looks "not loading" by React Query's own
  // definition), flashing a misleading "no tasks" state for the one render before
  // `ensureAllTemplatesFetched` (called synchronously during render, not from an effect) has had
  // a chance to flip `wantsAll` to `true`.
  const templatesLoading = !wantsAll || allTemplatesLoading;

  // Every id `useQueries` below should keep observing — see `useKnownTemplateIdsStore`'s own
  // comment for why this has to be a separate, only-grows list rather than `selectedChecklistTemplates`
  // itself (which legitimately shrinks on deselect/delete, and shouldn't take this hook's own
  // reactivity down with it).
  const [knownTemplateIds, setKnownTemplateIds] = useKnownTemplateIdsStore();
  const markTemplateIdKnown = React.useCallback(
    (id: string) => setKnownTemplateIds(prev => (prev.includes(id) ? prev : [...prev, id])),
    [setKnownTemplateIds],
  );
  const observedTemplateIds = React.useMemo(
    () => Array.from(new Set([...selectedChecklistTemplates, ...knownTemplateIds])),
    [selectedChecklistTemplates, knownTemplateIds],
  );

  // One real per-id query per observed template — covers every template this device actually
  // cares about (every owned one ends up here via `updateSelectedChecklistTemplate`/
  // `markTemplateIdKnown`, and every joined-challenge one via `mergeTemplates`'s own tracking
  // below), without violating rules of hooks the way calling `useChecklistTemplateDetail` in a
  // loop would: `useQueries` is React Query's own primitive for exactly "a dynamically-sized
  // array of keys, known from real state." Skipped once "all mine" already covers a given id (an
  // owned template — the common case), so this only actually fires for a template "all mine"
  // can't resolve: a joined challenge's owner-authored row, invisible to "all mine" (own
  // templates only) no matter how long it's been fetched — the same bypass
  // `getFieldGroupsByTemplateId` exists for one resource over.
  const byIdResults = useQueries({
    queries: observedTemplateIds.map(id => ({
      queryKey: checklistTemplatesKeys.byId(id, userId),
      queryFn: () => fetchOneTemplate(id),
      enabled: ready && !(wantsAll && allTemplates?.[id]),
      staleTime: Infinity,
    })),
  });

  // The merged view every read below works from: "all mine" (every owned template) plus whatever
  // the per-id queries above resolved (every joined-challenge template, plus any owned one not
  // yet covered by "all mine"). Real react-query subscriptions underneath, so this stays correct
  // without a manual sync effect — see useChecklistTemplates.tsx's own git history (pre-redesign)
  // for the effect this replaces, and useFieldGroups.tsx's own comment on why that shape doesn't
  // generalize to data with no equivalent "known list of ids" to key a `useQueries` call on.
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
        // Last-write-wins by `updatedAt` — this seeds a cache a real query for the same id could
        // independently be populating at the same time (`>=`, not `>`, for the same "a repeat-only
        // write doesn't bump this row's own updated_at" reason the old shared-map merge had — see
        // git history).
        if (!existing || new Date(template.updatedAt) >= new Date(existing.updatedAt)) {
          queryClient.setQueryData(key, template);
        }
        if (!existing) newIds.push(template.id);
      }

      // `selectedChecklistTemplates` is local-only and never itself fetched from the backend — a
      // template landing here for the first time on this device has never had a chance to be
      // selected or deselected, so it defaults in the same way creating one locally already does
      // (addChecklistTemplate). Without this, a merged template never actually shows up on the
      // calendar: getChecklistTemplateIdsByGivingDate filters by this list, not by whatever's
      // cached.
      if (newIds.length) {
        setSelectedChecklist(prev => {
          const additions = Array.from(new Set(newIds)).filter(id => !prev.includes(id));
          return additions.length ? [...prev, ...additions] : prev;
        });
      }
    },
    [queryClient, userId, allTemplates, setSelectedChecklist, markTemplateIdKnown],
  );

  // Canonical React Query optimistic-update shape (used by both `addChecklistTemplate` and
  // `updateChecklistTemplate` below) — see useTags.tsx's own saveTagMutation for the full
  // rationale (per-entity rollback, no onSettled refetch). Always called (even when there's
  // nothing to send over the wire — `wire.kind === 'none'`) so the optimistic write always
  // happens the same way regardless of branch, matching this hook's own previous behavior of
  // writing the merged template locally unconditionally and only skipping the *network* call
  // when nothing actually changed. Only a real create invalidates checklist-logs on success —
  // matching this hook's own previous behavior, where an ordinary field patch never did. Writes
  // to both the bulk "all mine" cache (if it's actually loaded) and this template's own per-id
  // cache (unconditionally) — a write here is always the caller's own template (only the owner
  // can create/update/delete one — a participant only ever writes via `updateMyReminder`), so
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
      // Keeps this id observed via `useQueries` regardless of `selectedChecklistTemplates`
      // membership — see `useKnownTemplateIdsStore`'s own comment. Matters most for
      // `updateChecklistTemplate`'s own `!existing` branch, which writes here without going
      // through `addChecklistTemplate`'s own `updateSelectedChecklistTemplate` call.
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
   * fallback-to-the-owner's-schedule value, which nothing on this device ever had a copy of to
   * fall back to. Bypasses `getChecklistTemplate`'s own dedupe (`fetchedScopes`) on purpose —
   * that scope was already marked fetched before this write, so a plain `getChecklistTemplate`
   * call here would just hand back the pre-write copy.
   */
  const updateMyReminder = async (id: string, repeat: ChecklistTemplate['repeat'] | null) => {
    await patchChecklistTemplate(id, { repeat });
    const result = await fetchChecklistTemplateById(id);
    if (result) mergeTemplates(result.templates);
  };

  /** One template by id — own, or anyone's if `visibility: 'public'` (see fetchChecklistTemplateById's
   * own comment). Prefers the bulk "all mine" query once that's covered this id (an owned
   * template — no extra network call for the common case); falls back to a one-off fetch
   * otherwise, which covers both "this device just hasn't fetched it yet" and the case "all mine"
   * can never cover at all — a joined challenge's template, owned by someone else.
   *
   * Routed through `mergeTemplates` (not a bare cache write) specifically so the fetched
   * template's id lands in `selectedChecklistTemplates` — that's what gives it a real
   * `useQueries` observer from the next render on. Without that, a fetch for an id outside
   * `selectedChecklistTemplates` would populate the cache with nothing subscribed to that key,
   * so it would resolve without ever triggering a re-render: React Query only notifies *active*
   * observers, and nothing here observes an arbitrary id ahead of time (the same reason
   * `useFieldGroupsForTemplate`/`useChecklistTemplateDetail` exist as real hooks for a consumer
   * that already knows its one id up front and wants that guarantee directly, rather than through
   * this callback). Deduped via a plain module-level Set (mirroring this function's original
   * shape) rather than `queryClient`'s own request-level dedup alone, since the gate needed here
   * is "have I already scheduled `mergeTemplates` for this fetch's result," not just "is a
   * network request already in flight." */
  const getChecklistTemplate = React.useCallback(
    (id: string): ChecklistTemplate | undefined => {
      const scopeKey = `${userId}:${id}`;
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
