import React from 'react';
import { eachDayOfInterval } from 'date-fns';
import type { CalendarEvent, CalendarRange } from '@dreamer/calendar-view';
import { useChecklist, useChecklistTemplates, getActiveFieldGroups, Checklist } from '@dreamer/global';

// A Checklist instance has no time of its own (`startedAt`/`endedAt` just span
// the whole day) — only a template with no field groups carries a single
// `repeat.byhour`/`byminute` worth plotting on an hourly grid (see
// ChecklistToday.desktop.tsx's own `getScheduledTimeLabel`). A field-group
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
const DEFAULT_PALETTE = [
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
};

export const useCalendarEvents = (range: CalendarRange | null, selectedTag: string): CalendarEvent[] => {
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();

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
    const spanningDaysByTemplate = new Map<string, { title: string; color: string; days: Date[] }>();

    eachDayOfInterval({ start: range.from, end: range.to }).forEach(day => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date: day,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });

      Object.values(checklist).forEach((task: Checklist) => {
        const template = checklistTemplate[task.checklistTemplateId];
        const avatarColor = template?.avatar.color;
        // Every "Create Task" entry point pre-selects this exact swatch (and
        // `AddInlineTask`'s quick-add row has no color picker at all, so it
        // always saves it) — it's the form's default value, not a color
        // anyone actually chose. Treating it the same as "unset" here is what
        // lets templates that were never deliberately given a color still
        // land on a distinct one, instead of every quickly-added task piling
        // onto this one shade.
        const color = avatarColor && avatarColor !== UNCHOSEN_AVATAR_COLOR ? avatarColor : hashColor(task.checklistTemplateId);
        const title = template?.title ?? task.title;
        const hasActiveFieldGroups = getActiveFieldGroups(template?.fieldGroups ?? []).length > 0;

        // A field-group-driven template's real schedule lives on each active group's own
        // `repeat`, not the template's top-level one — a top-level `recurring: false` there (e.g.
        // left over from before groups existed, or set by the Start/End Date dialog for its own
        // unrelated reason) must not merge every day into one spanning bar; each group can be
        // active on different days, which a single bar can't represent. Same guard as
        // `isTemplateScheduledOnDate`'s own.
        if (!hasActiveFieldGroups && template?.repeat?.recurring === false) {
          const entry = spanningDaysByTemplate.get(task.checklistTemplateId) ?? { title, color, days: [] };
          entry.days.push(day);
          spanningDaysByTemplate.set(task.checklistTemplateId, entry);
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
          } satisfies CalendarEventData,
        };

        if (!hasActiveFieldGroups && template?.repeat?.byhour) {
          const start = new Date(day);
          start.setHours(Number(template.repeat.byhour), Number(template.repeat.byminute), 0, 0);
          events.push({ ...base, start, end: computeEventEnd(day, start, template.repeat.until) });
        } else {
          events.push({ ...base, start: day, allDay: true });
        }
      });
    });

    spanningDaysByTemplate.forEach(({ title, color, days }, checklistTemplateId) => {
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
        data: { checklistTemplateId, date: start } satisfies CalendarEventData,
      });
    });

    return events;
  }, [range, getChecklistForDateWithoutFetching, checklistTemplate, selectedTag]);
};
