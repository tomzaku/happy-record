// Server-side counterpart to packages/global/src/utils/rruleUtils.ts — same rrule concepts
// (weekly `byday`/`interval`/`count`/`until`, one real `RRule` built from them), but operating on
// a raw `schedules` row (DB column names — byday/interval/count/until/started_at/timezone) rather
// than the client's camelCase `repeat` shape, and its own `npm:rrule` import (Deno's own module,
// not the client file's bundler-resolved one — see the import below for why that needs a small
// CJS-interop workaround). Every schedule-occurrence question an edge function needs — does this
// recur on day X, which days does it recur on between X and Y — goes through here instead of a
// hand-rolled byday/interval check, same reasoning as the client file's own header comment.
//
// Every date here is read/constructed through the row's own `timezone`, never a bare UTC read —
// `byday` was picked against the *local* calendar day it was set from (Asia/Saigon's own
// "Wednesday", say), and a bare UTC read of the same stored instant can land on the wrong weekday
// entirely (see `calendarDayIn`'s own doc comment, and rruleUtils.test.ts's coverage of exactly
// this — a local Wednesday stored as `...T17:00:00.000Z`, the *previous* UTC day).

// Deno's npm compat layer doesn't surface `rrule`'s named exports directly (CJS interop) — the
// default export carries them instead.
import rrulePkg from 'npm:rrule@2.8.1';
const { RRule } = rrulePkg;
type Weekday = InstanceType<typeof rrulePkg.Weekday>;

const ICAL_TO_WEEKDAY: Record<string, Weekday> = {
  SU: RRule.SU,
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
};

/** The subset of a raw `schedules` row every function below actually reads — not the full row
 * shape (`Row` in schedules.ts), so a caller (or a test) can pass a plain object with just these
 * fields rather than a whole fetched row. */
export type ScheduleRow = {
  byday?: unknown;
  interval?: unknown;
  count?: unknown;
  until?: unknown;
  started_at?: unknown;
  timezone?: unknown;
};

/** `date`'s own calendar day, `yyyy-MM-dd`, as read in `timeZone` — `en-CA` formats that way
 * natively, so there's no manual part-reassembly. The one bit of real IANA-timezone-awareness
 * every function below needs: see this file's own header comment on why a bare UTC read of the
 * same instant can disagree with which weekday a schedule was actually set for. */
export const calendarDayIn = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const dayToUTCMidnight = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date));
};
const dayToUTCEndOfDay = (day: string): Date => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date, 23, 59, 59, 999));
};
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Builds a real `RRule` from a raw `schedules` row, or `undefined` for "no schedule" (empty/
 * absent `byday`, or no `started_at` to anchor DTSTART to — a field_group row never has one, see
 * schedules.ts's own `fromRepeat`). `freq` is always `WEEKLY` — nothing in this app produces
 * anything else yet, same as the client file's own `buildRule`. Every date this reads off the row
 * (`started_at`, `until`) goes through `calendarDayIn` first — see this file's own header comment. */
export function buildRule(schedule: ScheduleRow): InstanceType<typeof RRule> | undefined {
  const byday = typeof schedule.byday === 'string' ? schedule.byday : '';
  if (!byday) return undefined;
  const byweekday = byday
    .split(',')
    .map(d => ICAL_TO_WEEKDAY[d.trim()])
    .filter((d): d is Weekday => !!d);
  if (byweekday.length === 0) return undefined;
  if (!schedule.started_at) return undefined;

  const timezone = typeof schedule.timezone === 'string' && schedule.timezone ? schedule.timezone : 'UTC';
  const dtstartDay = calendarDayIn(new Date(schedule.started_at as string), timezone);

  return new RRule({
    freq: RRule.WEEKLY,
    byweekday,
    interval: typeof schedule.interval === 'number' ? schedule.interval : 1,
    count: typeof schedule.count === 'number' ? schedule.count : undefined,
    until: schedule.until ? dayToUTCEndOfDay(calendarDayIn(new Date(schedule.until as string), timezone)) : undefined,
    dtstart: dayToUTCMidnight(dtstartDay),
  });
}

/** Does `schedule` recur on `day` (`yyyy-MM-dd`)? The one real occurrence-matching function for a
 * single day — `checklists-service.ts`'s own `saveChecklist` uses this to reject a client-sent
 * `started_at` the schedule doesn't actually recur on (the exact class of bug — "today" sent
 * regardless of which day was actually being viewed — behind a real live report) instead of
 * silently accepting it. */
export function exists(schedule: ScheduleRow, day: string): boolean {
  const rule = buildRule(schedule);
  if (!rule) return false;
  return rule.between(dayToUTCMidnight(day), dayToUTCEndOfDay(day), true).length > 0;
}

/** Every day (`yyyy-MM-dd`) `schedule` recurs on within `[from, to]`, ascending. `includingFrom`/
 * `includingTo` (both default `true`) drop the matching boundary day from the result when set to
 * `false` — a whole-day nudge of the search window rather than `RRule.between`'s own single
 * `inclusive` flag, since a caller sometimes wants only one edge open (e.g. paging a range one day
 * past wherever the previous page ended, without re-including that day). */
export function list(
  schedule: ScheduleRow,
  from: string,
  to: string,
  opts: { includingFrom?: boolean; includingTo?: boolean } = {},
): string[] {
  const rule = buildRule(schedule);
  if (!rule) return [];
  const { includingFrom = true, includingTo = true } = opts;
  const start = new Date(dayToUTCMidnight(from).getTime() + (includingFrom ? 0 : ONE_DAY_MS));
  const end = new Date(dayToUTCEndOfDay(to).getTime() - (includingTo ? 0 : ONE_DAY_MS));
  if (start > end) return [];
  return rule.between(start, end, true).map(d => calendarDayIn(d, 'UTC'));
}
