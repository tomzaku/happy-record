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

// A template with no `avatar.color` of its own (every seed/default template
// today) still gets a real, distinct color per template instead of one flat
// gray for everything — a deterministic hash of its id, so the same template
// always lands on the same color across renders/devices without needing a
// stored value. Swap for a real per-template color picker later; this is
// just the default.
const DEFAULT_PALETTE = ['#2f6fed', '#f2994a', '#27ae60', '#eb5757', '#9b51e0', '#2d9cdb', '#f2c94c', '#219653'];

const hashColor = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return DEFAULT_PALETTE[Math.abs(hash) % DEFAULT_PALETTE.length];
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

    eachDayOfInterval({ start: range.from, end: range.to }).forEach(day => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date: day,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });

      Object.values(checklist).forEach((task: Checklist) => {
        const template = checklistTemplate[task.checklistTemplateId];
        const color = template?.avatar.color || hashColor(task.checklistTemplateId);
        const hasActiveFieldGroups = getActiveFieldGroups(template?.fieldGroups ?? []).length > 0;

        const base = {
          id: task.id,
          title: template?.title ?? task.title,
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
          events.push({ ...base, start, end: new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60000) });
        } else {
          events.push({ ...base, start: day, allDay: true });
        }
      });
    });

    return events;
  }, [range, getChecklistForDateWithoutFetching, checklistTemplate, selectedTag]);
};
