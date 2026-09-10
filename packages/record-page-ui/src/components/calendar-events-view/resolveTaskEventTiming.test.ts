import { resolveTaskEventTiming } from './resolveTaskEventTiming';

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe('resolveTaskEventTiming', () => {
  it('a plain task with no byhour renders all-day, on the day it was found', () => {
    const result = resolveTaskEventTiming(day(2026, 9, 10), { repeat: {} }, false);
    expect(result).toEqual({ start: day(2026, 9, 10), allDay: true });
  });

  it('a field-group template never renders as a single timed event here, even with byhour set — each group has its own time, nothing here can pick one', () => {
    const result = resolveTaskEventTiming(day(2026, 9, 10), { repeat: { byhour: '9', byminute: '0' } }, true);
    expect(result.allDay).toBe(true);
  });

  it('a timed task (byhour set) renders at that time on the given day, with a 60-minute default end', () => {
    const result = resolveTaskEventTiming(day(2026, 9, 10), { repeat: { byhour: '9', byminute: '30' } }, false);
    expect(result.allDay).toBeUndefined();
    expect(result.start).toEqual(new Date(2026, 8, 10, 9, 30));
    expect(result.end).toEqual(new Date(2026, 8, 10, 10, 30));
  });

  it("a timed task's end reuses `until`'s own time-of-day when that lands later than start", () => {
    const result = resolveTaskEventTiming(
      day(2026, 9, 10),
      { repeat: { byhour: '9', byminute: '0', until: new Date(2000, 0, 1, 16, 30).toISOString() } },
      false,
    );
    expect(result.end).toEqual(new Date(2026, 8, 10, 16, 30));
  });

  it("falls back to the 60-minute default when `until`'s time-of-day would end before start", () => {
    const result = resolveTaskEventTiming(
      day(2026, 9, 10),
      { repeat: { byhour: '9', byminute: '0', until: new Date(2000, 0, 1, 8, 0).toISOString() } },
      false,
    );
    expect(result.end).toEqual(new Date(2026, 8, 10, 10, 0));
  });

  // Regression: a live report where an all-day recurring task, moved to a different day via
  // the Schedule dialog's "This event" scope, vanished from week/day (timeGrid) views while
  // still showing in month view. `modifiedOccurrences` only ever carries a full ISO instant —
  // for an all-day task, "moving the date" alone produces an override sitting at local midnight
  // — and the old code treated *any* override as reason enough to render the task as a *timed*
  // event, landing it at 00:00. FullCalendar's timeGrid views clip anything outside
  // `slotMinTime`/`slotMaxTime` (this app uses 06:00–23:00), so the moved task silently
  // disappeared there; month view has no such time-of-day window, so it kept showing the chip.
  // The fix: whether a task is timed at all still comes from the template's own `byhour`, never
  // from an override's mere presence.
  it('an all-day task (no byhour) moved to a different day still renders all-day there, not as a timed midnight event', () => {
    const result = resolveTaskEventTiming(
      day(2026, 9, 10), // the destination day — occursOnDate already resolved this before timing is asked for
      { repeat: { modifiedOccurrences: { '2026-09-09': day(2026, 9, 10).toISOString() } } },
      false,
    );
    expect(result).toEqual({ start: day(2026, 9, 10), allDay: true });
  });

  it("a genuinely timed task's moved occurrence renders at its own overridden moment, not the template's normal byhour", () => {
    const override = new Date(2026, 8, 10, 14, 0).toISOString();
    const result = resolveTaskEventTiming(
      day(2026, 9, 10),
      { repeat: { byhour: '9', byminute: '0', modifiedOccurrences: { '2026-09-09': override } } },
      false,
    );
    expect(result.start).toEqual(new Date(2026, 8, 10, 14, 0));
  });
});
