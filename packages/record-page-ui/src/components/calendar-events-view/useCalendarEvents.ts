import React from 'react';
import { eachDayOfInterval } from 'date-fns';
import type { CalendarEvent, CalendarRange } from '@dreamer/calendar-view';
import {
  useChecklist,
  useChecklistTemplates,
  hasGroupSchedule,
  getActiveFieldGroups,
  isFieldGroupActiveOnDay,
  Checklist,
} from '@dreamer/global';
import { DEFAULT_EVENT_MINUTES, resolveTaskEventTiming } from './resolveTaskEventTiming';
import { resolveTaskColor, DEFAULT_PALETTE } from './resolveTaskColor';

// Re-exported for TaskColorPicker (home-calendar), which offers the same 10 swatches for a
// manual pick.
export { DEFAULT_PALETTE };

export type CalendarEventData = {
  checklistTemplateId: string;
  checklistId?: string;
  date: Date;
  /** ids of the field groups actually due on this specific day (see isFieldGroupActiveOnDay) —
   * only ever set for a per-group-scheduled template with more than one active group (see
   * hasGroupSchedule); absent for a plain template, one with no field groups, or one in 'general'
   * schedule mode. Lets a click handler know exactly which group(s) this day's event covers
   * without re-deriving it from the template. */
  fieldGroupIds?: string[];
};

// `checklistTemplateId` scopes every day's tasks to one template — detail-task-page's own
// history calendar uses this; the home page's calendar leaves it unset.
export const useCalendarEvents = (
  range: CalendarRange | null,
  selectedTag: string,
  checklistTemplateId?: string,
  searchQuery?: string,
): CalendarEvent[] => {
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate, withFieldGroups } = useChecklistTemplates();

  React.useEffect(() => {
    if (!range) return;
    ensureChecklistsFetched({ from: range.from, to: range.to });
  }, [range, ensureChecklistsFetched]);

  return React.useMemo(() => {
    if (!range) return [];

    const events: CalendarEvent[] = [];
    // A `recurring: false` (one-time) template still gets one real Checklist instance per day —
    // collected per template here and turned into a single spanning bar after the day loop,
    // Bryntum-style, instead of one chip per day.
    const spanningDaysByTemplate = new Map<
      string,
      { title: string; color: string; days: Date[]; allDone: boolean }
    >();
    // Same idea for a one-time event with a real time set (`byhour`) — its own `startedAt`/`until`
    // are absolute timestamps for the whole span already, so this just tracks title/color/done-ness
    // per day found rather than reconstructing an end from each individual day.
    const timedSpanByTemplate = new Map<
      string,
      { title: string; color: string; start: Date; end: Date; allDone: boolean }
    >();

    eachDayOfInterval({ start: range.from, end: range.to }).forEach(day => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date: day,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });

      Object.values(checklist).forEach((task: Checklist) => {
        if (checklistTemplateId && task.checklistTemplateId !== checklistTemplateId) return;

        // `fieldGroups` isn't a column on the raw template row — merge it in, or a field-group
        // template reads as having none.
        const rawTemplate = checklistTemplate[task.checklistTemplateId];
        const template = rawTemplate ? withFieldGroups(rawTemplate) : undefined;
        const color = resolveTaskColor(template, task.checklistTemplateId);
        const hasActiveFieldGroups = hasGroupSchedule(template ?? {});

        // Only worth surfacing once there's more than one group to disambiguate between.
        const allGroups = getActiveFieldGroups(template?.fieldGroups ?? []);
        const groupsToday = hasActiveFieldGroups
          ? allGroups.filter(group => isFieldGroupActiveOnDay(group.repeat, day))
          : [];
        const title =
          allGroups.length > 1 && groupsToday.length > 0
            ? `${template?.title ?? task.title} · ${groupsToday.map(group => group.title).join(', ')}`
            : template?.title ?? task.title;

        // A field-group template's real schedule lives on each group's own `repeat`, not the
        // template's top-level `recurring: false` (which can be a stale leftover) — never merge
        // one of these into a single spanning bar.
        if (!hasActiveFieldGroups && template?.repeat?.recurring === false) {
          if (!template?.repeat?.byhour) {
            const entry = spanningDaysByTemplate.get(task.checklistTemplateId) ?? {
              title,
              color,
              days: [],
              allDone: true,
            };
            entry.days.push(day);
            // The bar reads as done only once every day it spans is — one
            // incomplete instance is enough to keep the whole thing looking
            // active, the same way a partly-checked-off multi-day task should.
            entry.allDone = entry.allDone && Boolean(task.completedAt);
            spanningDaysByTemplate.set(task.checklistTemplateId, entry);
            return;
          }

          // `startedAt`/`until` are the actual from/to instant for the whole span already — used
          // as-is, not reapplied per iterated day.
          const spanStart = new Date(template.repeat.startedAt ?? day);
          spanStart.setHours(Number(template.repeat.byhour), Number(template.repeat.byminute), 0, 0);
          const spanEnd = template.repeat.until
            ? new Date(template.repeat.until)
            : new Date(spanStart.getTime() + DEFAULT_EVENT_MINUTES * 60000);
          const entry = timedSpanByTemplate.get(task.checklistTemplateId) ?? {
            title,
            color,
            start: spanStart,
            end: spanEnd,
            allDone: true,
          };
          entry.allDone = entry.allDone && Boolean(task.completedAt);
          timedSpanByTemplate.set(task.checklistTemplateId, entry);
          return;
        }

        const base = {
          id: task.id,
          title,
          color,
          done: Boolean(task.completedAt),
          data: {
            checklistTemplateId: task.checklistTemplateId,
            checklistId: task.clientOnly ? undefined : task.id,
            date: day,
            ...(groupsToday.length > 0 ? { fieldGroupIds: groupsToday.map(group => group.id) } : {}),
          } satisfies CalendarEventData,
        };

        // See resolveTaskEventTiming.test.ts for the timed-vs-all-day rules, including a
        // `MODIFIED` occurrence relocated to a different day.
        const timing = resolveTaskEventTiming(day, template, hasActiveFieldGroups);
        events.push({ ...base, ...timing });
      });
    });

    spanningDaysByTemplate.forEach(({ title, color, days, allDone }, checklistTemplateId) => {
      const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime());
      const start = sortedDays[0];
      const lastDay = sortedDays[sortedDays.length - 1];
      // FullCalendar's own `end` is exclusive for an all-day span, so the last actual day needs
      // +1 to be included in the rendered bar.
      const end = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1);
      events.push({
        id: `range:${checklistTemplateId}`,
        title,
        color,
        start,
        end,
        allDay: true,
        done: allDone,
        data: { checklistTemplateId, date: start } satisfies CalendarEventData,
      });
    });

    timedSpanByTemplate.forEach(({ title, color, start, end, allDone }, checklistTemplateId) => {
      events.push({
        id: `range:${checklistTemplateId}`,
        title,
        color,
        start,
        end,
        done: allDone,
        data: { checklistTemplateId, date: start } satisfies CalendarEventData,
      });
    });

    const trimmedQuery = searchQuery?.trim().toLowerCase();
    if (!trimmedQuery) return events;
    return events.filter(event => event.title.toLowerCase().includes(trimmedQuery));
  }, [
    range,
    getChecklistForDateWithoutFetching,
    checklistTemplate,
    withFieldGroups,
    selectedTag,
    checklistTemplateId,
    searchQuery,
  ]);
};
