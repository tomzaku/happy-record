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

export type RepeatLike = {
  byday?: string;
  byhour?: string;
  byminute?: string;
  interval?: number;
  count?: number;
  startedAt?: string;
  until?: string;
};

/**
 * Builds a real `RRule` from this app's client-shape `repeat` object. `undefined` for "not
 * scheduled" (empty/absent `byday`), matching every prior hand-rolled check's own convention.
 * `anchorDate` is used as DTSTART only when `repeat` has no `startedAt` of its own — a field
 * group's own `repeat` never has one (see fieldGroupTypes.ts), so its recurrence anchors to
 * whatever date is actually being tested, same as today's date-independent weekday-set check.
 * `freq` is always `WEEKLY` — nothing in this app produces anything else yet.
 */
export function buildRule(repeat: RepeatLike | undefined, anchorDate: Date): RRule | undefined {
  if (!repeat?.byday) return undefined;
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
    until: repeat.until ? toUTCEndOfDay(new Date(repeat.until)) : undefined,
    dtstart: toUTCMidnight(new Date(repeat.startedAt ?? anchorDate)),
  });
}

/**
 * Does this schedule recur on the given calendar day? The one real occurrence-matching function,
 * replacing every hand-rolled weekday-set membership check in this app. Calendar-day comparison
 * only (no real timezone math — matching code never used the `timezone` field for this check
 * before either), via a UTC-midnight window so rrule's own UTC-based day arithmetic lines up with
 * whatever local calendar day `date` represents.
 */
export function occursOnDate(repeat: RepeatLike | undefined, date: Date): boolean {
  const rule = buildRule(repeat, date);
  if (!rule) return false;
  return rule.between(toUTCMidnight(date), toUTCEndOfDay(date), true).length > 0;
}

const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The next calendar day (strictly after `fromDate`) this schedule is next due — `'Tomorrow'` for
 * the very next day, otherwise the short weekday name. `undefined` when there's no schedule, or
 * no further occurrence left (an exhausted `count`/`until`).
 */
export function nextOccurrenceLabel(repeat: RepeatLike | undefined, fromDate: Date): string | undefined {
  const rule = buildRule(repeat, fromDate);
  if (!rule) return undefined;
  const from = toUTCMidnight(fromDate);
  const next = rule.after(from, false);
  if (!next) return undefined;
  const offsetDays = Math.round((toUTCMidnight(next).getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  return offsetDays === 1 ? 'Tomorrow' : SHORT_DAY_NAMES[next.getUTCDay()];
}
