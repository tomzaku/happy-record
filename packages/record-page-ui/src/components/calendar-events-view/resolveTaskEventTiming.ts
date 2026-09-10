import { movedOccurrenceOnDate } from '@dreamer/global/src/utils/rruleUtils';

export const DEFAULT_EVENT_MINUTES = 60;

type RepeatLike = {
  byhour?: string;
  byminute?: string;
  until?: string;
  modifiedOccurrences?: Record<string, string>;
};

// `until`'s own time-of-day (not just its date) is reused as a daily end time — see
// resolveTaskEventTiming.test.ts for why.
export function computeEventEnd(day: Date, start: Date, until: string | undefined): Date {
  if (until) {
    const untilTime = new Date(until);
    const end = new Date(day);
    end.setHours(untilTime.getHours(), untilTime.getMinutes(), 0, 0);
    if (end.getTime() > start.getTime()) {
      return end;
    }
  }
  return new Date(start.getTime() + DEFAULT_EVENT_MINUTES * 60000);
}

export type TaskEventTiming = { start: Date; end?: Date; allDay?: boolean };

/** Where one task's event renders on `day` — timed or all-day, and at what moment. See
 * resolveTaskEventTiming.test.ts for the scenarios this covers, including a `MODIFIED`
 * occurrence's own relocated day. */
export function resolveTaskEventTiming(
  day: Date,
  template: { repeat?: RepeatLike } | undefined,
  hasActiveFieldGroups: boolean,
): TaskEventTiming {
  if (hasActiveFieldGroups || !template?.repeat?.byhour) {
    return { start: day, allDay: true };
  }
  const modifiedStart = movedOccurrenceOnDate(template.repeat, day);
  const start = modifiedStart ? new Date(modifiedStart) : new Date(day);
  if (!modifiedStart) start.setHours(Number(template.repeat.byhour), Number(template.repeat.byminute), 0, 0);
  return { start, end: computeEventEnd(day, start, template.repeat.until) };
}
