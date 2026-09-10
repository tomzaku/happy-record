import React from 'react';
import { startOfDay, endOfDay } from 'date-fns';
import type { CalendarEvent, CalendarRange } from '@dreamer/calendar-view';
import {
  useChecklist,
  useChecklistTemplates,
  hasGroupSchedule,
  getActiveFieldGroups,
  isFieldGroupActiveOnDay,
  checklistInstanceId,
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

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const isWithinRange = (date: Date, range: CalendarRange) => date >= startOfDay(range.from) && date <= endOfDay(range.to);

// `checklistTemplateId` scopes every day's tasks to one template — detail-task-page's own
// history calendar uses this; the home page's calendar leaves it unset.
export const useCalendarEvents = (
  range: CalendarRange | null,
  selectedTag: string,
  checklistTemplateId?: string,
  searchQuery?: string,
): CalendarEvent[] => {
  const { getChecklistsForTemplate, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate, selectedChecklistTemplates, getTemplateOccurrencesInRange } =
    useChecklistTemplates();

  React.useEffect(() => {
    if (!range) return;
    ensureChecklistsFetched({ from: range.from, to: range.to });
  }, [range, ensureChecklistsFetched]);

  return React.useMemo(() => {
    if (!range) return [];

    const events: CalendarEvent[] = [];
    const spanningDaysByTemplate = new Map<
      string,
      { title: string; color: string; days: Date[]; allDone: boolean }
    >();
    const timedSpanByTemplate = new Map<
      string,
      { title: string; color: string; start: Date; end: Date; allDone: boolean }
    >();

    // `new Set` guards against a stray duplicate id in `selectedChecklistTemplates` — nothing
    // else here dedupes a template's own events, so one would otherwise render twice.
    const templateIds = checklistTemplateId ? [checklistTemplateId] : [...new Set(selectedChecklistTemplates)];
    for (const id of templateIds) {
      const template = checklistTemplate[id];
      if (!template) continue;
      if (selectedTag !== 'all' && !(template.tags ?? []).includes(selectedTag)) continue;

      const hasActiveFieldGroups = hasGroupSchedule(template);
      const color = resolveTaskColor(template, id);

      // A one-off (`recurring: false`) template isn't rrule-driven at all — its events come
      // straight from its own real Checklist rows in range, no placeholder synthesis. Collected
      // into a single spanning bar, Bryntum-style, instead of one chip per day.
      if (!hasActiveFieldGroups && template.repeat?.recurring === false) {
        const rows = getChecklistsForTemplate(id).filter(row => isWithinRange(new Date(row.startedAt), range));
        if (rows.length === 0) continue;

        if (!template.repeat?.byhour) {
          const entry = spanningDaysByTemplate.get(id) ?? { title: template.title, color, days: [], allDone: true };
          for (const row of rows) {
            entry.days.push(startOfDay(new Date(row.startedAt)));
            entry.allDone = entry.allDone && Boolean(row.completedAt);
          }
          spanningDaysByTemplate.set(id, entry);
          continue;
        }

        // `startedAt`/`until` are the actual from/to instant for the whole span already — used
        // as-is, not reapplied per row.
        const spanStart = new Date(template.repeat.startedAt ?? rows[0].startedAt);
        spanStart.setHours(Number(template.repeat.byhour), Number(template.repeat.byminute), 0, 0);
        const spanEnd = template.repeat.until
          ? new Date(template.repeat.until)
          : new Date(spanStart.getTime() + DEFAULT_EVENT_MINUTES * 60000);
        timedSpanByTemplate.set(id, {
          title: template.title,
          color,
          start: spanStart,
          end: spanEnd,
          allDone: rows.every(row => Boolean(row.completedAt)),
        });
        continue;
      }

      // Genuinely recurring (real weekly `byday`, own or field-group union) — one `list()`-driven
      // pass per template instead of testing every day against every template.
      const dates = getTemplateOccurrencesInRange(id, range.from, range.to);
      const allGroups = getActiveFieldGroups(template.fieldGroups ?? []);
      const rows = getChecklistsForTemplate(id);

      for (const date of dates) {
        const row = rows.find(r => isSameDay(new Date(r.startedAt), date));
        const groupsToday = hasActiveFieldGroups
          ? allGroups.filter(group => isFieldGroupActiveOnDay(group.repeat, date))
          : [];
        const title =
          allGroups.length > 1 && groupsToday.length > 0
            ? `${template.title} · ${groupsToday.map(group => group.title).join(', ')}`
            : template.title;

        const base = {
          id: row?.id ?? checklistInstanceId(id, date),
          title,
          color,
          done: Boolean(row?.completedAt),
          data: {
            checklistTemplateId: id,
            checklistId: row && !row.clientOnly ? row.id : undefined,
            date,
            ...(groupsToday.length > 0 ? { fieldGroupIds: groupsToday.map(group => group.id) } : {}),
          } satisfies CalendarEventData,
        };

        // See resolveTaskEventTiming.test.ts for the timed-vs-all-day rules, including a
        // `MODIFIED` occurrence relocated to a different day.
        const timing = resolveTaskEventTiming(date, template, hasActiveFieldGroups);
        events.push({ ...base, ...timing });
      }
    }

    spanningDaysByTemplate.forEach(({ title, color, days, allDone }, id) => {
      const sortedDays = [...days].sort((a, b) => a.getTime() - b.getTime());
      const start = sortedDays[0];
      const lastDay = sortedDays[sortedDays.length - 1];
      // FullCalendar's own `end` is exclusive for an all-day span, so the last actual day needs
      // +1 to be included in the rendered bar.
      const end = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1);
      events.push({
        id: `range:${id}`,
        title,
        color,
        start,
        end,
        allDay: true,
        done: allDone,
        data: { checklistTemplateId: id, date: start } satisfies CalendarEventData,
      });
    });

    timedSpanByTemplate.forEach(({ title, color, start, end, allDone }, id) => {
      events.push({
        id: `range:${id}`,
        title,
        color,
        start,
        end,
        done: allDone,
        data: { checklistTemplateId: id, date: start } satisfies CalendarEventData,
      });
    });

    const trimmedQuery = searchQuery?.trim().toLowerCase();
    if (!trimmedQuery) return events;
    return events.filter(event => event.title.toLowerCase().includes(trimmedQuery));
  }, [
    range,
    getChecklistsForTemplate,
    checklistTemplate,
    selectedChecklistTemplates,
    getTemplateOccurrencesInRange,
    selectedTag,
    checklistTemplateId,
    searchQuery,
  ]);
};
