import { v4 } from 'uuid';
import React from 'react';
import { startOfDay } from 'date-fns';
import { useLocalStorage } from '../../hook/useLocalStorage';
import { useSessionStore } from '../../hook/useSessionStore';
import { useSession } from '../../hook/useSession';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';

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

export type FieldGroup = {
  id: string;
  title: string;
  fields: string[];
  note: unknown;
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
   * silently unreachable. `fieldGroups` is jsonb end to end (see
   * supabase/functions/_shared/checklistTemplates.ts), so this needed no migration.
   */
  repeat?: {
    hour: string;
    minute: string;
    dayOfWeek: string;
  };
  /**
   * Soft delete — set (to the deletion time) instead of removing the group from `fieldGroups`,
   * by "Delete Group" in the group's own settings menu (ChecklistFieldGroupMenu). There's no
   * undo anywhere else in this app
   * (a write here is immediate and optimistic, same as everywhere — see CLAUDE.md's "online-first"
   * section), so this is what makes a group's own title/note/schedule/fields recoverable at all
   * after a delete, rather than that config being gone the instant the request fires. Every
   * consumer that renders or counts "the template's groups" should go through
   * `getActiveFieldGroups` (below) rather than reading `fieldGroups` directly, so an archived
   * group doesn't silently reappear in a tab list, a schedule union, or a group-name summary
   * that forgot to filter it out.
   *
   * Restoring a group must set this to `null`, not `undefined` — `JSON.stringify` drops an
   * `undefined`-valued key entirely, so it would never even reach `patchChecklistTemplate`'s
   * request body, and the per-group patch merge (`_shared/checklistTemplates.ts`'s
   * `mergeFieldGroupPatches`, a plain `{ ...group, ...patch }`) only overwrites keys the patch
   * actually contains — the group would look restored locally (optimistic update) while staying
   * archived server-side, forever, until whatever local copy showed it restored got reloaded.
   * `null` isn't dropped by `JSON.stringify`, so it reaches the merge and actually overwrites.
   */
  archivedAt?: string | null;
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
 * `fieldGroups` is one jsonb column, so a plain top-level diff of it is
 * all-or-nothing — every call site rebuilds the whole array even to change
 * one group's note (see ChecklistFieldGroup's onUpdateNote). This finds the
 * actual per-group diff so `updateChecklistTemplate` can send just what
 * changed in each group instead of every group's full config.
 *
 * Returns `full` when the group list itself changed shape (added, removed,
 * reordered) — there's no per-id diff to take there, it's a real replace.
 * Returns `patches` — one partial group per id that actually changed — the
 * rest of the time.
 */
function diffFieldGroups(
  next: FieldGroup[],
  prev: FieldGroup[],
): { full: FieldGroup[] } | { patches: (Partial<FieldGroup> & Pick<FieldGroup, 'id'>)[] } | null {
  if (JSON.stringify(next) === JSON.stringify(prev)) return null;

  const sameShape =
    next.length === prev.length && next.every((group, i) => group.id === prev[i]?.id);
  if (!sameShape) return { full: next };

  const patches: (Partial<FieldGroup> & Pick<FieldGroup, 'id'>)[] = [];
  next.forEach((group, i) => {
    const prevGroup = prev[i];
    if (JSON.stringify(group) === JSON.stringify(prevGroup)) return;
    const patch: Partial<FieldGroup> & Pick<FieldGroup, 'id'> = { id: group.id };
    for (const key of Object.keys(group) as (keyof FieldGroup)[]) {
      if (key === 'id') continue;
      if (JSON.stringify(group[key]) !== JSON.stringify(prevGroup[key])) {
        (patch as Record<string, unknown>)[key] = group[key];
      }
    }
    patches.push(patch);
  });
  return { patches };
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
    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(currentChecklistTemplate) as (keyof ChecklistTemplate)[]) {
      if (key === 'id' || key === 'fieldGroups') continue;
      if (JSON.stringify(template[key]) !== JSON.stringify(existing[key])) {
        changes[key] = template[key];
      }
    }

    // fieldGroups gets its own diff one level down — see diffFieldGroups.
    if ('fieldGroups' in currentChecklistTemplate) {
      const diff = diffFieldGroups(
        currentChecklistTemplate.fieldGroups,
        existing.fieldGroups ?? [],
      );
      if (diff && 'full' in diff) {
        changes.fieldGroups = diff.full;
      } else if (diff && diff.patches.length > 0) {
        changes.fieldGroupPatches = diff.patches;
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

  // useCallback'd (not a plain closure) so a consumer's own useSyncedSelector
  // can memoize on it — its identity now only changes when `checklistTemplate`
  // itself changes, instead of on every render.
  const getRecommendChecklistTemplates = React.useCallback((): ChecklistTemplate[] => {
    ensureAllTemplatesFetched();
    return Object.values(checklistTemplate);
  }, [checklistTemplate, ensureAllTemplatesFetched]);

  const getChecklistTemplateIdsByGivingDate = React.useCallback(
    ({ date }: { date: Date } = { date: new Date() }) => {
      ensureAllTemplatesFetched();
      return selectedChecklistTemplates.filter(checklistTemplateId => {
        const currentChecklistTemplate = checklistTemplate[checklistTemplateId];

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
    [selectedChecklistTemplates, checklistTemplate, ensureAllTemplatesFetched],
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
      return checklistTemplate[id];
    },
    [checklistTemplate, userId, ready, mergeTemplates],
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
