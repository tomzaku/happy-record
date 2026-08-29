import { v4 } from 'uuid';
import React from 'react';
import { startOfDay } from 'date-fns';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';
import type { FieldOverrides } from '../record-field/useRecordField';
import { useFieldGroups } from './useFieldGroups';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import {
  fetchChecklistTemplateById,
  fetchChecklistTemplates,
  patchChecklistTemplate,
  removeChecklistTemplate as removeChecklistTemplateApi,
  saveChecklistTemplate,
} from './checklistTemplatesApi';

const CHECKLIST_TEMPLATE_KEY = 'checklist_template';
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
  /** This group's own persistent note — see useNoteById.ts and ChecklistFieldGroupView. Set the
   * first time someone actually writes into it; absent means no note yet. */
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
   * else in this app (a write here is immediate and optimistic, same as everywhere — see
   * CLAUDE.md's "online-first" section), so this is what makes a group's own title/schedule/
   * fields recoverable at all after a delete, rather than that config being gone the instant the
   * request fires. Every consumer that renders or counts "the template's groups" should go
   * through `getActiveFieldGroups` (below) rather than reading a fetched list directly, so an
   * archived group doesn't silently reappear in a tab list, a schedule union, or a group-name
   * summary that forgot to filter it out.
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
    completedAt?: string;
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

// Fetched by whatever scope is actually asked for — one id, or "all mine"
// (needed by the management screen and by schedule-matching for the home
// view) — never unconditionally on mount. Keyed so the same (identity,
// scope) tuple isn't re-fetched every call within a page load.
const fetchedScopes = new Set<string>();
const ALL_SCOPE = '__all__';

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

export const useChecklistTemplates = () => {
  const [checklistTemplate, setChecklistTemplate] = useSessionStore<
    Record<string, ChecklistTemplate>
  >(CHECKLIST_TEMPLATE_KEY, {});
  const [selectedChecklistTemplates, setSelectedChecklist] = useLocalStorage<
    string[]
  >(SELECTED_CHECKLISTS_TEMPLATE_KEY, []);
  const { userId, ready } = useSession();
  // Starts `true` and flips to `false` once the "all mine" fetch settles
  // (success or a quiet `null` both count — either way, there's nothing left
  // to wait on). `checklistTemplate` being empty is otherwise indistinguishable
  // from "hasn't loaded yet" — a consumer like ChecklistToday needs this to
  // tell "no tasks exist" apart from "still fetching," so it doesn't flash a
  // misleading empty state before the real data has had a chance to arrive.
  const [templatesLoading, setTemplatesLoading] = useSessionStore<boolean>(
    'checklist_templates_loading',
    true,
  );

  // `field-groups` is its own resource now (see useFieldGroups.tsx) — a fetched template here
  // never carries real `fieldGroups` from the server anymore. `getChecklistTemplate`/
  // `getRecommendChecklistTemplates` below merge that store's own fetch onto the object they
  // return; the effect further down additionally keeps every *stored* template's own
  // `.fieldGroups` in sync too, for the several places that still read `checklistTemplate[id]`
  // directly instead of through those getters (WeeklyCalendarVertical/Horizontal,
  // ChecklistToday, EditChecklistForm, useChecklists.tsx) — without it, only callers that went
  // through `getChecklistTemplate` would ever see a group.
  const { getFieldGroups, ensureAllFieldGroupsFetched, fieldGroupList } = useFieldGroups();

  // Keeps every stored template's own `.fieldGroups` in sync with the field-groups store
  // whenever it changes — see the comment above `getFieldGroups` for why this can't just live
  // inside the read functions alone.
  React.useEffect(() => {
    setChecklistTemplate(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        const groups = getFieldGroups(id);
        if (JSON.stringify(next[id].fieldGroups) !== JSON.stringify(groups)) {
          next[id] = { ...next[id], fieldGroups: groups };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // Deliberately keyed on `fieldGroupList` alone, not `getFieldGroups`/`checklistTemplate` —
    // this only needs to rerun when the field-groups store itself actually changes; including
    // the others would refire on every template fetch too, for no benefit (a fetched template
    // gets today's `fieldGroupList` snapshot in the very next tick anyway).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldGroupList]);

  // Shared by every fetch path below (one id, or "all mine") so a template
  // landing here for the first time — no matter which scope brought it in —
  // gets the same treatment `addChecklistTemplate` already gives a
  // locally-created one.
  const mergeTemplates = React.useCallback(
    (fetched: ChecklistTemplate[]) => {
      if (!fetched.length) return;
      const newIds: string[] = [];
      setChecklistTemplate(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const template of fetched) {
          const existing = merged[template.id];
          // Last-write-wins by `updatedAt` — cheap safety even though a
          // direct scoped fetch makes a real conflict rare.
          if (!existing || new Date(template.updatedAt) > new Date(existing.updatedAt)) {
            merged[template.id] = template;
            changed = true;
            if (!existing) newIds.push(template.id);
          }
        }
        return changed ? merged : prev;
      });

      // `selectedChecklistTemplates` is local-only and never itself fetched
      // from the backend (see CLAUDE.md) — a template landing here for the
      // first time on this device has never had a chance to be selected or
      // deselected, so it defaults in the same way creating one locally
      // already does (addChecklistTemplate). Without this, a fetched
      // template exists in `checklistTemplate` but never actually shows up
      // on the calendar: getChecklistTemplateIdsByGivingDate filters by
      // this list, not by `checklistTemplate` itself.
      if (newIds.length) {
        setSelectedChecklist(prev => {
          // `newIds` itself can't carry a duplicate within one call (see
          // above), but dedupe defensively anyway — this is the same list
          // getChecklistTemplateIdsByGivingDate filters over directly, so a
          // repeated id here means a template's checklist rendering twice
          // for the same day everywhere that reads it.
          const additions = Array.from(new Set(newIds)).filter(id => !prev.includes(id));
          return additions.length ? [...prev, ...additions] : prev;
        });
      }
    },
    [setChecklistTemplate, setSelectedChecklist],
  );

  // "All mine" — needed by the management screen and by schedule-matching
  // for the home view (getChecklistTemplateIdsByGivingDate below checks
  // every selected template's own schedule, which needs each of their real
  // rows loaded). Fetched once per identity, not on every call.
  const ensureAllTemplatesFetched = React.useCallback(() => {
    const scopeKey = JSON.stringify({ userId, scope: ALL_SCOPE });
    if (!ready || fetchedScopes.has(scopeKey)) return;
    fetchedScopes.add(scopeKey);
    fetchChecklistTemplates().then(result => {
      if (!result) {
        fetchedScopes.delete(scopeKey);
        setTemplatesLoading(false);
        return;
      }
      mergeTemplates(result.templates);
      setTemplatesLoading(false);
    });
  }, [userId, ready, mergeTemplates, setTemplatesLoading]);

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
    setChecklistTemplate({
      ...checklistTemplate,
      [id]: template,
    });
    updateSelectedChecklistTemplate([...selectedChecklistTemplates, id]);
    // Optimistic — the caller gets `id` back immediately, before this
    // resolves, same as every other write in this app (see CLAUDE.md's
    // "online-first"). `saved` is exposed alongside it for the rare caller
    // that references this id from *another table's* row before this one
    // has necessarily landed server-side (useJoinChallenge.tsx forking a
    // template then immediately inserting a challenge_participants row whose
    // checklist_template_id has a real FK to this table — awaiting `saved`
    // there is what keeps that insert from racing this row's own POST).
    // Most callers can ignore it; the local store is already up to date.
    const saved = saveChecklistTemplate(template);
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
    setChecklistTemplate({
      ...checklistTemplate,
      [currentChecklistTemplate.id]: template,
    });

    if (!existing) {
      // Nothing on the server yet for this id — this is really a create,
      // so it needs the full row, not a diff against nothing.
      saveChecklistTemplate(template);
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

    if (Object.keys(changes).length > 0) {
      patchChecklistTemplate(currentChecklistTemplate.id, changes);
    }
  };

  const deleteChecklistTemplate = (id: string) => {
    const newChecklistTemplate = { ...checklistTemplate };
    delete newChecklistTemplate[id];
    setChecklistTemplate(newChecklistTemplate);
    removeChecklistTemplateApi(id);
    // Also remove from selected templates if it was selected
    if (selectedChecklistTemplates.includes(id)) {
      updateSelectedChecklistTemplate(
        selectedChecklistTemplates.filter(templateId => templateId !== id),
      );
    }
  };

  const updateSelectedChecklistTemplate = (checklistIds: string[] = []) => {
    // Dedupe here, once, rather than trusting every caller — this is the
    // single choke point every write to the list goes through (the
    // checkbox in checklist-template-page-ui, addChecklistTemplate below).
    // getChecklistTemplateIdsByGivingDate filters this list directly with
    // no dedup of its own, so a duplicate id here renders that template's
    // checklist more than once for the same day, everywhere it's read. This
    // also self-heals a list that already picked up a duplicate from an
    // older client build, rather than requiring the id to be manually
    // cleared out of localStorage.
    setSelectedChecklist(Array.from(new Set(checklistIds)));
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

  const getChecklistTemplate = React.useCallback(
    (id: string) => {
      const scopeKey = JSON.stringify({ userId, id });
      if (ready && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchChecklistTemplateById(id).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeTemplates(result.templates);
        });
      }
      const template = checklistTemplate[id];
      return template && withFieldGroups(template);
    },
    [checklistTemplate, userId, ready, mergeTemplates, withFieldGroups],
  );

  return {
    checklistTemplate,
    templatesLoading,
    getChecklistTemplate,
    addChecklistTemplate,
    updateChecklistTemplate,
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
