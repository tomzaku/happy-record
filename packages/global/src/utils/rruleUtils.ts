// The one place the `rrule` package is touched — every recurrence-matching call in this app goes
// through `occursOnDate`/`nextOccurrenceLabel` instead of a hand-rolled weekday-set check. The
// client's `repeat.byday` shape (a comma-separated list of iCal weekday codes — SU/MO/TU/WE/TH/
// FR/SA) matches the DB's own rrule-named `repeats` columns byte-for-byte now — see
// supabase/shared/repeats.ts, which no longer translates it.

import { RRule, Weekday } from 'rrule';

const ICAL_TO_WEEKDAY: Record<string, Weekday> = {
  SU: RRule.SU,
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
};

export const ICAL_WEEKDAY_ORDER = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export const ALL_ICAL_DAYS = ICAL_WEEKDAY_ORDER.join(',');

const toUTCMidnight = (date: Date): Date => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
const toUTCEndOfDay = (date: Date): Date =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));
// `YYYY-MM-DD`, local-calendar-day (same getters as toUTCMidnight above) — matches
// `exceptionDates`' own shape, a Postgres `date` column round-tripping as a bare date string with
// no time/zone component to misinterpret.
const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export type RepeatLike = {
  byday?: string;
  byhour?: string;
  byminute?: string;
  interval?: number;
  count?: number;
  startedAt?: string;
  until?: string;
  /** `false` means a one-time arrangement — every calendar day from `startedAt` through `until`,
   * no weekday pattern at all (built as a plain `FREQ=DAILY` rule — see `buildRule`'s own doc
   * comment). Absent/`true` keeps the normal weekly `byday` recurrence below. See
   * `ChecklistTemplate['repeat'].recurring`'s own comment for why this exists as a separate
   * question from "does it eventually stop" (`until`/`count`, unaffected either way). */
  recurring?: boolean;
  /** How long one occurrence runs, in milliseconds — display data only (e.g. "8am-10am", or a
   * 3-day span for an occurrence that starts one calendar day and runs into a later one). NOT
   * consulted by `occursOnDate`/`buildRule` below: matching only ever asks "does an occurrence
   * *start* on this calendar day," never "is a still-running multi-day occurrence still active on
   * this day" — a long `durationMs` doesn't make this schedule occupy any extra days as far as
   * scheduling is concerned (see rruleUtils.test.ts's own coverage of this). Wiring that in is a
   * separate, bigger change to this matching logic, not assumed here. */
  durationMs?: number;
  /** `YYYY-MM-DD` dates this schedule's own `DELETED`-type `schedule_exceptions` rows cover —
   * Google Calendar's EXDATE, "delete this one occurrence" without touching the rest of the
   * series. Checked first in `occursOnDate`, before either matching branch, so it wins over both
   * a real `byday` match and the one-time-arrangement date range. Server-embedded (see
   * `supabase/shared/schedules.ts`'s `toRepeat`) — the client never fetches these separately. */
  exceptionDates?: string[];
};

/**
 * Builds a real `RRule` from this app's client-shape `repeat` object — for every shape this app
 * has, not just the weekly-`byday` one, so every caller below can just call `.between()`/`.after()`
 * on whatever comes back instead of hand-rolling its own date arithmetic for a case rrule already
 * covers. Two shapes:
 * - A real weekday pattern (`byday` set) — `FREQ=WEEKLY`, same as always.
 * - A one-time arrangement (`recurring: false`, genuinely no `byday` — see `occursOnDate`'s own
 *   doc comment on why `byday` always wins when it's actually set) — `FREQ=DAILY`, `interval`/
 *   `count` never apply to this shape (see `ChecklistTemplate['repeat'].recurring`'s own comment),
 *   so every day from `startedAt` through `until` (open-ended without one) is a real occurrence,
 *   exactly like the old hand-rolled range check, just expressed as an actual rule instead.
 *
 * `undefined` for "not scheduled" (no `byday` and not a one-time arrangement, or no `startedAt` to
 * anchor either shape's DTSTART to). `anchorDate` is used as DTSTART only when `repeat` has no
 * `startedAt` of its own — a field group's own `repeat` never has one (see fieldGroupTypes.ts), so
 * its recurrence anchors to whatever date is actually being tested, same as today's
 * date-independent weekday-set check (never reachable for the one-time-arrangement shape, which
 * always requires a real `startedAt`).
 */
export function buildRule(repeat: RepeatLike | undefined, anchorDate: Date): RRule | undefined {
  if (!repeat) return undefined;
  const until = repeat.until ? toUTCEndOfDay(new Date(repeat.until)) : undefined;

  if (!repeat.byday) {
    if (repeat.recurring !== false || !repeat.startedAt) return undefined;
    return new RRule({ freq: RRule.DAILY, dtstart: toUTCMidnight(new Date(repeat.startedAt)), until });
  }

  const byweekday = repeat.byday
    .split(',')
    .map(d => ICAL_TO_WEEKDAY[d.trim()])
    .filter((d): d is Weekday => !!d);
  if (byweekday.length === 0) return undefined;

  return new RRule({
    freq: RRule.WEEKLY,
    byweekday,
    interval: repeat.interval ?? 1,
    count: repeat.count,
    until,
    dtstart: toUTCMidnight(new Date(repeat.startedAt ?? anchorDate)),
  });
}

/**
 * Does this schedule recur on the given calendar day? The one real occurrence-matching function,
 * replacing every hand-rolled weekday-set membership check in this app. Calendar-day comparison
 * only (no real timezone math — matching code never used the `timezone` field for this check
 * before either), via a UTC-midnight window so rrule's own UTC-based day arithmetic lines up with
 * whatever local calendar day `date` represents. `buildRule` above already covers both real
 * schedule shapes (weekly `byday`, and a one-time `recurring: false` arrangement as a plain daily
 * rule) — see its own comment on why `byday` always wins when it's genuinely set, regardless of a
 * stale `recurring: false` (the actual bug behind a real report: a template edited to add a
 * genuine weekly pattern kept a leftover `recurring: false` from before it had one, and every day
 * silently matched instead of just the picked weekdays).
 */
export function occursOnDate(repeat: RepeatLike | undefined, date: Date): boolean {
  if (!repeat) return false;
  if (repeat.exceptionDates?.includes(toDateKey(date))) return false;
  const rule = buildRule(repeat, date);
  if (!rule) return false;
  return rule.between(toUTCMidnight(date), toUTCEndOfDay(date), true).length > 0;
}

/**
 * Every calendar day in `[from, to]` this schedule recurs on, ascending — `rrule`'s own
 * `between()` does the real work (same as `occursOnDate` above, just handed a wider window
 * instead of one day) for both schedule shapes `buildRule` covers, not a day-by-day walk
 * re-deriving what the library already computes. `exceptionDates` is filtered afterward — same
 * "wins over a real match" rule `occursOnDate` applies per-day. `includingFrom`/`includingTo`
 * (both default `true`) drop the matching boundary day when `false` — same shape as the server's
 * own `supabase/shared/rruleUtils.ts` `list`, for a caller that wants only one edge open (e.g.
 * paging a range one day past wherever the previous page ended, without re-including that day).
 */
export function list(
  repeat: RepeatLike | undefined,
  from: Date,
  to: Date,
  opts: { includingFrom?: boolean; includingTo?: boolean } = {},
): Date[] {
  const rule = buildRule(repeat, from);
  if (!rule) return [];
  const { includingFrom = true, includingTo = true } = opts;
  const oneDayMs = 24 * 60 * 60 * 1000;
  const start = new Date(toUTCMidnight(from).getTime() + (includingFrom ? 0 : oneDayMs));
  const end = new Date(toUTCEndOfDay(to).getTime() - (includingTo ? 0 : oneDayMs));
  if (start > end) return [];
  return rule.between(start, end, true).filter(d => !repeat?.exceptionDates?.includes(toDateKey(d)));
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The next calendar day (strictly after `fromDate`) this schedule is next due — `'Tomorrow'` for
 * the very next day, otherwise the short weekday name. `undefined` when there's no schedule, or
 * no further occurrence left (an exhausted `count`/`until`) — `rrule`'s own `.after()` on
 * whichever real rule `buildRule` returns, for both schedule shapes it covers.
 */
export function nextOccurrenceLabel(repeat: RepeatLike | undefined, fromDate: Date): string | undefined {
  const from = toUTCMidnight(fromDate);
  const rule = buildRule(repeat, fromDate);
  if (!rule) return undefined;
  const next = rule.after(from, false);
  if (!next) return undefined;
  const offsetDays = Math.round((toUTCMidnight(next).getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return offsetDays === 1 ? 'Tomorrow' : SHORT_DAY_NAMES[next.getUTCDay()];
}
