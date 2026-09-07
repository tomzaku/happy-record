import React from 'react';
import { eachDayOfInterval } from 'date-fns';
import type { EventInput } from '@fullcalendar/core';
import { useChecklist, useChecklistTemplates, getActiveFieldGroups, Checklist } from '@dreamer/global';

// A Checklist instance has no time of its own (`startedAt`/`endedAt` just span
// the whole day) — only a template with no field groups carries a single
// `repeat.byhour`/`byminute` worth plotting on an hourly grid (see
// ChecklistToday.desktop.tsx's own `getScheduledTimeLabel`). A field-group
// template has no single time to show there either, so it renders here as an
// all-day event instead of guessing which group's hour should win.
const DEFAULT_EVENT_MINUTES = 30;

type Range = { from: Date; to: Date } | null;

export type CalendarEventProps = {
  navigateTo: string;
};

export const useCalendarEvents = (range: Range, selectedTag: string): EventInput[] => {
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();

  React.useEffect(() => {
    if (!range) return;
    ensureChecklistsFetched({ from: range.from, to: range.to });
  }, [range, ensureChecklistsFetched]);

  return React.useMemo(() => {
    if (!range) return [];

    const events: EventInput[] = [];

    eachDayOfInterval({ start: range.from, end: range.to }).forEach(day => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date: day,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });

      Object.values(checklist).forEach((task: Checklist) => {
        const template = checklistTemplate[task.checklistTemplateId];
        const color = template?.avatar.color || '#8A8A8A';
        const hasActiveFieldGroups = getActiveFieldGroups(template?.fieldGroups ?? []).length > 0;

        const params = new URLSearchParams({ currentDay: day.toISOString() });
        if (!task.clientOnly) params.set('checklistId', task.id);

        const base: EventInput = {
          id: task.id,
          title: template?.title ?? task.title,
          backgroundColor: color,
          borderColor: color,
          classNames: task.completedAt ? ['home-calendar-event-done'] : undefined,
          extendedProps: { navigateTo: `/task/${task.checklistTemplateId}?${params.toString()}` } satisfies CalendarEventProps,
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
