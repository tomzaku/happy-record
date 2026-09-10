import React from 'react';
import { eachDayOfInterval, format } from 'date-fns';
import type { CalendarEvent, CalendarRange } from '@dreamer/calendar-view';
import {
  useChecklist,
  useChecklistTemplates,
  hasGroupSchedule,
  getActiveFieldGroups,
  isFieldGroupActiveOnDay,
  Checklist,
} from '@dreamer/global';

// A Checklist instance has no time of its own (`startedAt`/`endedDate` just span
// whole calendar days) — only a template with no field groups carries a single
// `repeat.byhour`/`byminute` worth plotting on an hourly grid (see
// ChecklistDay.desktop.tsx's own `getScheduledTimeLabel`). A field-group
// template has no single time to show there either, so it renders here as an
// all-day event instead of guessing which group's hour should win.
const DEFAULT_EVENT_MINUTES = 60;

// The pre-selected swatch every "Create Task" form seeds `selectedColor`
// with (`CoreChecklistForm.tsx`, `create-task-modal`, `CreateChecklistForm`),
// and the only color `AddInlineTask`'s quick-add row can ever save — not a
// color anyone actually picked, just the form default.
const UNCHOSEN_AVATAR_COLOR = '#607d8b';

// A template with no `avatar.color` of its own (every seed/default template
// today) still gets a real, distinct color per template instead of one flat
// gray for everything — a deterministic hash of its id, so the same template
// always lands on the same color across renders/devices without needing a
// stored value. Fixed at 10 colors, each a visually distinct hue, so two
// unrelated templates rarely land on the same one. Swap for a real
// per-template color picker later; this is just the default.
// Exported for TaskColorPicker (home-calendar) — the same fixed 10 swatches offered there for a
// manual per-template pick, so a manually-chosen color always looks like it could have been the
// automatic one.
export const DEFAULT_PALETTE = [
  '#2f6fed', // blue
  '#f2994a', // orange
  '#27ae60', // green
  '#eb5757', // red
  '#9b51e0', // purple
  '#2d9cdb', // light blue
  '#f2c94c', // yellow
  '#1abc9c', // teal
  '#eb5a90', // pink
  '#8d6e63', // brown
];

const hashColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return DEFAULT_PALETTE[Math.abs(hash) % DEFAULT_PALETTE.length];
};

// `repeat.until` is really "the last day this schedule repeats" (rrule's
// UNTIL) — recurrence generation only ever reads its *date*, truncating to
// end-of-day (see `rruleUtils.ts`'s `buildRule`). But the "Start & End Date"
// picker that writes it (`StartEndDateFields.tsx`) lets someone pick a real
// clock time for it too, same as the start-time field, and that time is
// otherwise stored and never read anywhere — the exact "16:30 typed in, only
// a 1-hour block shown" gap being fixed here. Reusing it as a daily end time
// (ignoring its date, applying its hour/minute to every occurrence) is a
// calendar-only reading of already-stored data — it doesn't touch
// `buildRule` or when the schedule actually stops repeating.
const computeEventEnd = (day: Date, start: Date, until: string | undefined): Date => {
  if (until) {
    const untilTime = new Date(until);
    const end = new Date(day);
    end.setHours(untilTime.getHours(), untilTime.getMinutes(), 0, 0);
    if (end.getTime() > start.getTime()) {
      return end;
    }
  }
  return new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60000);
};

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

// `checklistTemplateId` scopes every day's tasks to one template instead of everything
// scheduled that day — detail-task-page's own history calendar (ChecklistTemplateCalendar) uses
// this; the home page's own CalendarEventsView usage leaves it unset. Same optional-scope shape
// `WeekView`/`MonthView`/`YearView` used before this replaced them there.
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
    // A `recurring: false` template (see rruleUtils.ts's `occursInRange`) is a one-time
    // arrangement, not a weekly pattern — it still gets one real Checklist instance per day (each
    // independently completable, same as any other task), but visually it should read as the one
    // bar it actually is, Bryntum-style, not one chip per day. Collected here instead of pushed
    // immediately; turned into a single spanning event per template after the day loop, covering
    // exactly the days actually found to have an instance in this range (not re-derived from
    // `startedAt`/`until` — those may extend beyond what's actually been fetched/confirmed).
    const spanningDaysByTemplate = new Map<
      string,
      { title: string; color: string; days: Date[]; allDone: boolean }
    >();
    // Same one-bar-not-one-chip-per-day idea as spanningDaysByTemplate above, for a one-time event
    // that has a real time set (`byhour`) instead of being All Day. Its `startedAt`/`until` are
    // already absolute timestamps for the whole span, not a time-of-day pattern to reapply to each
    // occurrence's own day the way a genuinely recurring template's `byhour`/`until` are used below
    // (`computeEventEnd`) — so this collects only title/color/done-ness per day found, and takes
    // start/end straight from the template's own repeat once, instead of reconstructing an end from
    // each individual day like the per-day branch does.
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

        // `checklistTemplate[id]` alone has no `fieldGroups` — that's not a column on the row
        // (see useChecklistTemplates.tsx's own comment) — so every hasGroupSchedule/field-group
        // check below needs the merged copy, not the raw map entry, or a field-group template
        // reads as having none and falls through to the plain/spanning-bar branches below as if
        // it were a bare recurring task.
        const rawTemplate = checklistTemplate[task.checklistTemplateId];
        const template = rawTemplate ? withFieldGroups(rawTemplate) : undefined;
        const avatarColor = template?.avatar.color;
        // `calendarColor` (TaskColorPicker, home-calendar) is a deliberate manual pick, scoped to
        // the calendar only — takes priority over everything below when set. Below that: every
        // "Create Task" entry point pre-selects this exact swatch (and `AddInlineTask`'s quick-add
        // row has no color picker at all, so it always saves it) — it's the form's default value,
        // not a color anyone actually chose. Treating it the same as "unset" here is what lets
        // templates that were never deliberately given a color still land on a distinct one,
        // instead of every quickly-added task piling onto this one shade.
        const color =
          template?.calendarColor ??
          (avatarColor && avatarColor !== UNCHOSEN_AVATAR_COLOR ? avatarColor : hashColor(task.checklistTemplateId));
        const hasActiveFieldGroups = hasGroupSchedule(template ?? {});

        // Which of this template's own active groups are actually due *today* (not just active
        // in general — a group can have its own independent day-of-week schedule, see
        // isFieldGroupActiveOnDay) — only worth surfacing once there's more than one group to
        // disambiguate between; a single-group template's own title already says what it is.
        const allGroups = getActiveFieldGroups(template?.fieldGroups ?? []);
        const groupsToday = hasActiveFieldGroups
          ? allGroups.filter(group => isFieldGroupActiveOnDay(group.repeat, day))
          : [];
        const title =
          allGroups.length > 1 && groupsToday.length > 0
            ? `${template?.title ?? task.title} · ${groupsToday.map(group => group.title).join(', ')}`
            : template?.title ?? task.title;

        // A field-group-driven template's real schedule lives on each active group's own
        // `repeat`, not the template's top-level one — a top-level `recurring: false` there (e.g.
        // left over from before groups existed, or set by the Start/End Date dialog for its own
        // unrelated reason) must not merge every day into one spanning bar; each group can be
        // active on different days, which a single bar can't represent. Same guard as
        // `isTemplateScheduledOnDate`'s own.
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

          // A one-time event with a real time set — `startedAt`/`until` carry the actual from/to
          // instant for the whole span (e.g. Sept 9 8am to Sept 10 12:47pm), not a time-of-day to
          // reapply to whichever day is being iterated, so take them as-is rather than routing
          // through `computeEventEnd` (which would truncate `until` back onto `day`).
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

        // "This event only" (a `MODIFIED` schedule_exceptions row — ScheduleEditDialogs' own
        // edit-scope prompt) overrides just this one day's own start moment, without touching the
        // series' normal `byhour`/`byminute` — see checklistTemplateTypes.ts's own
        // `modifiedOccurrences` doc comment.
        const modifiedStart = template?.repeat?.modifiedOccurrences?.[format(day, 'yyyy-MM-dd')];

        if (!hasActiveFieldGroups && (template?.repeat?.byhour || modifiedStart)) {
          const start = new Date(modifiedStart ?? day);
          if (!modifiedStart) start.setHours(Number(template!.repeat!.byhour), Number(template!.repeat!.byminute), 0, 0);
          events.push({ ...base, start, end: computeEventEnd(day, start, template?.repeat?.until) });
        } else {
          events.push({ ...base, start: day, allDay: true });
        }
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
