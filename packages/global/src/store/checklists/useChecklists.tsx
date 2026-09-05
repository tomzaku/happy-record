import React from 'react';
import { useSessionStore, useSession } from '../../hook';
import { useChecklistTemplates } from './useChecklistTemplates';
import { useFieldGroups } from './useFieldGroups';
import { v4, v5 as uuidv5 } from 'uuid';
import { startOfDay, endOfDay, addDays, format } from 'date-fns';
import { getEffectiveDayOfWeek } from '../../utils/scheduleUtils';

// Backend — see CLAUDE.md's "online-first data layer". Every call is quiet:
// a failure resolves to null and this hook's own in-memory state is the
// fallback, unchanged.
import { useQueryClient } from '@tanstack/react-query';
import { fetchChecklistById, fetchChecklists, removeChecklist, saveChecklist } from './checklistsApi';
import { checklistLogsKeys } from '../checklist-logs/checklistLogsKeys';

const CHECKLIST_KEY = 'checklist';

export type Checklist = {
  id: string;
  title: string;
  checklistTemplateId: string;
  completedAt?: string;
  startedAt: string;
  endedAt: string;
  clientOnly?: boolean;
  updatedAt: string;
};

// Fetched by whatever scope is actually asked for — one day, one range, one
// id, or one template's whole history — never "everything." Keyed so the
// same (identity, scope) tuple isn't re-fetched every call within a page
// load; `userId` is part of every key so a scope already fetched for one
// identity re-fetches once the signed-in identity actually changes.
const fetchedScopes = new Set<string>();

const dayScopeKey = (userId: string | undefined, date: Date) =>
  JSON.stringify({ userId, day: date.toDateString() });

// A scheduled template's `Checklist` instance for a given day is naturally
// identified by (checklistTemplateId, calendar day) — the whole app assumes
// at most one exists per day (computeChecklistsForDate's own
// `checklistsByGivingDate.find` below). A random `v4()` id for that instance
// only holds that invariant if nothing ever races the fetch that would have
// found the real row first — and clicking a scheduled checklist's checkbox,
// or opening `detail-task-page`, both can, before this day's own GET has
// resolved. Deriving the id from the natural key instead means every racing
// "not found, let's create one" attempt converges on the *same* id, so
// `saveChecklist`'s upsert just updates one row instead of inserting a new
// one each time — the same fix CLAUDE.md's `fields.id` note already
// describes: a client-generated id must be unique per its own scope, and
// when that scope has a natural key, derive the id from it rather than
// hoping concurrent writers never collide. Namespace is an arbitrary fixed
// UUID (uuidv5 requires one); `format` (not `toDateString`/
// `toLocaleDateString`) keeps the day key locale-independent, so the same
// (template, day) hashes identically regardless of the device's locale.
const CHECKLIST_INSTANCE_NAMESPACE = '2f21ee1e-6b0a-4a5b-9b0b-2b9a6a2e6b62';
export function checklistInstanceId(checklistTemplateId: string, date: Date): string {
  return uuidv5(`${checklistTemplateId}:${format(date, 'yyyy-MM-dd')}`, CHECKLIST_INSTANCE_NAMESPACE);
}

export const useChecklist = () => {
  const [checklist, setChecklist] = useSessionStore<Record<string, Checklist>>(CHECKLIST_KEY, {});
  const { userId, ready } = useSession();
  const queryClient = useQueryClient();
  const invalidateChecklistLogs = () => queryClient.invalidateQueries({ queryKey: checklistLogsKeys.all });
  const { getChecklistTemplateIdsByGivingDate, checklistTemplate } =
    useChecklistTemplates();
  const { getFieldGroups } = useFieldGroups();
  // Starts `true`, flips to `false` once a checklists fetch (either path
  // below) settles — success or a quiet `null`. `checklist` being empty is
  // otherwise indistinguishable from "hasn't loaded yet"; ChecklistToday
  // needs this to show a loading state instead of flashing "No tasks
  // found!" before the real data has had a chance to arrive.
  const [checklistsLoading, setChecklistsLoading] = useSessionStore<boolean>(
    'checklists_loading',
    true,
  );

  const mergeFetched = React.useCallback(
    (fetched: Checklist[]) => {
      if (!fetched.length) return;
      setChecklist(prev => {
        const merged = { ...prev };
        let changed = false;
        for (const item of fetched) {
          const existing = merged[item.id];
          // Last-write-wins by `updatedAt` — cheap safety even though a
          // direct scoped fetch makes a real conflict rare.
          if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
            merged[item.id] = item;
            changed = true;
          }
        }
        return changed ? merged : prev;
      });
    },
    [setChecklist],
  );

  // A wider-range fetch a multi-day view (WeeklyCalendarVertical) can call
  // once for its whole visible window instead of relying on
  // getRepeatChecklistByGivingDate's own one-day fallback below — asking
  // for 4 weeks one day at a time was 28 separate requests; a caller that
  // knows it needs a week (or several) can ask for that in one instead.
  // Scoped by the exact (identity, from, to) tuple, same dedup mechanism as
  // every other scoped fetch here.
  const ensureChecklistsFetched = React.useCallback(
    ({ from, to }: { from: Date; to: Date }) => {
      const rangeKey = JSON.stringify({
        userId,
        from: startOfDay(from).toISOString(),
        to: endOfDay(to).toISOString(),
      });
      if (!ready || fetchedScopes.has(rangeKey)) return;
      fetchedScopes.add(rangeKey);
      // Every day inside this range is claimed *before* the request fires,
      // not after it resolves — ChecklistToday and this range fetch mount as
      // siblings on the same page (see index.desktop.tsx/index.mobile.tsx)
      // and their effects can run in the same tick, before either's network
      // round trip completes. Marking after `.then()` left a window where
      // both fired for the same day (ChecklistToday's own per-day dayScopeKey
      // check, right below, races this instead of ever seeing it). Marking
      // synchronously means whichever of the two effects runs second — in
      // practice, ChecklistToday's, since the weekly calendar mounts first
      // in both layouts — sees the day already claimed and skips its own
      // request. Cleared alongside `rangeKey` on failure so a real rejection
      // (offline, no backend) doesn't leave these days permanently un-fetchable.
      const days: Date[] = [];
      for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
        days.push(day);
        fetchedScopes.add(dayScopeKey(userId, day));
      }
      fetchChecklists({
        from: startOfDay(from).toISOString(),
        to: endOfDay(to).toISOString(),
      }).then(result => {
        if (!result) {
          fetchedScopes.delete(rangeKey);
          days.forEach(day => fetchedScopes.delete(dayScopeKey(userId, day)));
          setChecklistsLoading(false);
          return;
        }
        mergeFetched(result.checklists);
        setChecklistsLoading(false);
      });
    },
    [userId, ready, mergeFetched, setChecklistsLoading],
  );

  // Pure — derives a day's view from whatever's already in the local store,
  // no fetch triggered. Split out from getRepeatChecklistByGivingDate below
  // so a caller that manages its own fetching (WeeklyCalendarVertical, via
  // ensureChecklistsFetched, one request per visible week rather than one
  // per day) can read a day's computed view without also triggering that
  // day's own redundant single-day fetch — computing this inside a
  // useMemo/render, as every consumer here does, runs before any effect
  // does, so a fetch trigger left in the read path itself always wins the
  // race against a wider batched fetch scheduled from an effect.
  const computeChecklistsForDate = React.useCallback(
    ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
      // Get existing checklists for the given date
      const checklistsByGivingDate = Object.values(checklist).filter(
        currentChecklist =>
          new Date(currentChecklist.startedAt).toLocaleDateString() ===
          date.toLocaleDateString(),
      );

      // Get scheduled checklist template IDs for the given date
      const checklistTemplatesByGivingDateIds =
        getChecklistTemplateIdsByGivingDate({
          date,
        });

      // Create checklists from scheduled templates. `checklistTemplate[id]`
      // can transiently be missing now that templates are fetched by scope
      // rather than all upfront — skip it this render rather than crash;
      // the template's own fetch resolving triggers this to recompute
      // (`checklistTemplate` is already in this callback's deps below).
      const scheduledChecklists: Checklist[] = checklistTemplatesByGivingDateIds
        .filter(id => checklistTemplate[id])
        .map(id => {
          const foundChecklist = checklistsByGivingDate.find(
            c => c.checklistTemplateId === id,
          );
          if (foundChecklist) {
            return foundChecklist;
          } else {
            return {
              id: checklistInstanceId(id, date),
              clientOnly: true,
              title: checklistTemplate[id].title,
              checklistTemplateId: id,
              startedAt: new Date(date).toISOString(),
              endedAt: (() => {
                const endDate = new Date(date);
                endDate.setHours(23, 59, 59, 999);
                return endDate.toISOString();
              })(),
              // Never synced or reconciled against — this is a throwaway
              // view, not yet a row this device has decided to persist
              // (see updateChecklist's comment on that first-edit moment).
              updatedAt: new Date(date).toISOString(),
            };
          }
        });

      const nonScheduledChecklists = Object.values(checklist).filter(
        existingChecklist => {
          const template =
          checklistTemplate[existingChecklist.checklistTemplateId];

        // Must agree with checklistTemplatesByGivingDateIds above on what
        // "scheduled" means, or a template whose schedule lives entirely on
        // its field groups (no template-level `repeat` set — the normal
        // shape once a template has any field groups, see
        // getEffectiveDayOfWeek's own comment) reads as unscheduled here
        // while being correctly scheduled there. That double-counts it: it
        // shows up once from `scheduledChecklists` (found by id, today's
        // real row) *and* again here (its `startedAt` falls today too),
        // rendering the same template's checklist twice for the day.
        // `fieldGroups` isn't a column on `template` itself anymore (see
        // useFieldGroups.tsx) — `checklistTemplate[id]` alone never carries
        // it, so this fetches/reads the real, current groups directly
        // rather than trusting a stale (or perpetually empty) copy.
        const effectiveDayOfWeek = getEffectiveDayOfWeek({
          ...template,
          fieldGroups: template ? getFieldGroups(template.id) : [],
        });
        const hasSchedule = !!effectiveDayOfWeek && effectiveDayOfWeek.trim() !== '';
        if(hasSchedule) return false;

        // A one-off (unscheduled) checklist belongs to exactly the day it
        // was started, not a range from there onward — and completedAt
        // being set shouldn't make it appear on every day back to the
        // beginning of time either. `completedAt` doesn't factor into
        // which day this shows on at all; it's just whether it's checked
        // off when it does.
        const startedAtDate = new Date(existingChecklist.startedAt);
        return startedAtDate >= startOfDay(date) && startedAtDate <= endOfDay(date);
        },
      );
      // Combine scheduled, non-scheduled, and forever checklists. Deduped by
      // id as a safety net — an id shouldn't ever land in both arrays, or
      // twice within one of them, but a stale duplicate that slipped into
      // `selectedChecklistTemplates` (see updateSelectedChecklistTemplate)
      // would otherwise render the same task's card twice for the day.
      const allChecklists = [
        ...new Map(
          [...scheduledChecklists, ...nonScheduledChecklists].map(c => [c.id, c]),
        ).values(),
      ];

      // Filter by selected tag if provided
      let filteredChecklists = allChecklists;
      if (selectedTag && selectedTag !== 'all') {
        filteredChecklists = allChecklists.filter(checklist => {
          const template = checklistTemplate[checklist.checklistTemplateId];
          return template?.tags?.includes(selectedTag);
        });
      }

      return {
        checklistIds: filteredChecklists.map(checklist => checklist.id),
        checklist: filteredChecklists.reduce(
          (acc: Record<string, Checklist>, checklist: Checklist) => ({
            ...acc,
            [checklist.id]: checklist,
          }),
          {},
        ),
      };
    },
    [checklist, getChecklistTemplateIdsByGivingDate, checklistTemplate, getFieldGroups],
  );

  // The original combined "fetch this day, then read it" shape — still what
  // a single-day view (ChecklistToday) wants, so its own fetch keeps
  // happening automatically on read with no separate effect to remember.
  const getRepeatChecklistByGivingDate = React.useCallback(
    (
      { date, selectedTag }: { date: Date; selectedTag?: string } = {
        date: new Date(),
      },
    ) => {
      // Background fetch for this exact day — merges into the store when it
      // lands, visible next time this day is read. A quiet `null` (offline,
      // no backend) just means "use what this device already has." A no-op
      // when a wider ensureChecklistsFetched call already covered this day
      // (see above).
      const dayKey = dayScopeKey(userId, date);
      if (ready && !fetchedScopes.has(dayKey)) {
        fetchedScopes.add(dayKey);
        fetchChecklists({
          from: startOfDay(date).toISOString(),
          to: endOfDay(date).toISOString(),
        }).then(result => {
          if (!result) {
            fetchedScopes.delete(dayKey);
            setChecklistsLoading(false);
            return;
          }
          mergeFetched(result.checklists);
          setChecklistsLoading(false);
        });
      }

      return computeChecklistsForDate({ date, selectedTag });
    },
    [computeChecklistsForDate, userId, ready, setChecklistsLoading],
  );

  const updateChecklist = React.useCallback(
    (checklistToUpdate: Partial<Checklist> & { id: Checklist['id'] }) => {
      const merged: Checklist = {
        ...checklist[checklistToUpdate.id],
        ...checklistToUpdate,
        // Every write bumps this — see CLAUDE.md's "every table gets
        // updated_at" convention. Set here, not left to the caller, so it
        // can never be forgotten at a call site.
        updatedAt: new Date().toISOString(),
      };
      setChecklist(prev => ({
        ...prev,
        [checklistToUpdate.id]: merged,
      }));
      // `merged` may be a client-only instance's first real edit (see
      // getRepeatChecklistByGivingDate — the home page's checkbox updates
      // one of these directly) with no row on the server yet. `saveChecklist`
      // is an upsert, so that's exactly right: this call is what creates it.
      const saved = saveChecklist(merged);
      // A completedAt change is the only thing this route ever logs
      // server-side (see checklists-service.ts's own saveChecklist) — only
      // bump for that, not every unrelated field edit that also goes through
      // this same upsert.
      if ('completedAt' in checklistToUpdate) {
        saved.then(result => {
          if (result) invalidateChecklistLogs();
        });
      }
    },
    [checklist, setChecklist, invalidateChecklistLogs],
  );

  const addChecklist = React.useCallback(
    (checklistToAdd: Omit<Checklist, 'id' | 'updatedAt'> & { id?: string }) => {
      // Callers that already know the natural (checklistTemplateId, day) key
      // — detail-task-page's "create today's instance if one doesn't exist
      // yet" effect — pass `checklistInstanceId(...)` explicitly so a
      // re-run of that effect (a remount before its own `setSearchParams`
      // landed, a race with this day's own fetch) upserts the same row
      // instead of minting a new one. Falls back to a fresh `v4()` for a
      // genuine one-off (AddInlineTask) with no such natural key.
      const id = checklistToAdd.id ?? v4();
      const newChecklist: Checklist = {
        ...checklistToAdd,
        id,
        updatedAt: new Date().toISOString(),
      };
      setChecklist(prev => ({
        ...prev,
        [id]: newChecklist,
      }));
      saveChecklist(newChecklist);
      return newChecklist;
    },
    [checklist, setChecklist],
  );

  const getChecklistByGivingDate = React.useCallback(
    ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
      const { checklistIds, checklist } = getRepeatChecklistByGivingDate({
        date,
        selectedTag,
      });
      return {
        checklist,
        checklistIds,
      };
    },
    [getRepeatChecklistByGivingDate],
  );

  // Same read as getChecklistByGivingDate, but no fetch side effect — for a
  // caller that's already fetching its own range via ensureChecklistsFetched
  // (WeeklyCalendarVertical, one call per day it renders) and would
  // otherwise fire that many redundant single-day requests before its own
  // batched fetch even gets a chance to run.
  const getChecklistForDateWithoutFetching = React.useCallback(
    ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
      const { checklistIds, checklist } = computeChecklistsForDate({ date, selectedTag });
      return {
        checklist,
        checklistIds,
      };
    },
    [computeChecklistsForDate],
  );

  // Async and awaited (unlike the other read functions here) — its one
  // consumer (EditChecklistForm's "delete every instance of this template")
  // is a one-shot action that needs the real, complete list this tick, not
  // a render-time value that's fine to start incomplete and fill in later.
  // Builds the result from what's already cached plus the fresh response
  // directly, not by re-reading `checklist` after the await (that closure
  // is stale by the time `mergeFetched`'s `setChecklist` actually lands).
  const getAllChecklistWithTemplate = React.useCallback(
    async (checklistTemplateId: string): Promise<Checklist[]> => {
      const have: Record<string, Checklist> = {};
      for (const item of Object.values(checklist)) {
        if (item.checklistTemplateId === checklistTemplateId) have[item.id] = item;
      }
      if (ready) {
        const result = await fetchChecklists({ checklistTemplateId });
        if (result) {
          mergeFetched(result.checklists);
          for (const item of result.checklists) have[item.id] = item;
        }
      }
      return Object.values(have).sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );
    },
    [checklist, ready, mergeFetched],
  );

  const getChecklistDetail = React.useCallback(
    (id: string) => {
      const scopeKey = JSON.stringify({ userId, checklistId: id });
      if (ready && !fetchedScopes.has(scopeKey)) {
        fetchedScopes.add(scopeKey);
        fetchChecklistById(id).then(result => {
          if (!result) {
            fetchedScopes.delete(scopeKey);
            return;
          }
          mergeFetched(result.checklists);
        });
      }
      return checklist[id];
    },
    [checklist, userId, ready, mergeFetched],
  );

  const deleteChecklist = React.useCallback(
    (id: string) => {
      setChecklist(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      removeChecklist(id);
    },
    [setChecklist],
  );

  return {
    updateChecklist,
    getChecklistByGivingDate,
    getChecklistForDateWithoutFetching,
    ensureChecklistsFetched,
    getAllChecklistWithTemplate,
    addChecklist,
    getChecklistDetail,
    deleteChecklist,
    checklistsLoading,
  };
};
