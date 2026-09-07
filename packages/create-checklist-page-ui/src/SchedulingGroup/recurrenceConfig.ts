import { Day } from '@dreamer/tasks-page-common';
import { ICAL_WEEKDAY_ORDER, icalToDay, isRecurringSchedule } from '@dreamer/global';
import { WEEK_DAYS } from './WeekDaysPills';

export type EndCondition =
  | { type: 'never' }
  | { type: 'onDate'; until: string }
  | { type: 'after'; count: number };

export type Frequency = 'off' | 'daily' | 'weekly' | 'custom';

export type RecurrenceValue = {
  frequency: Frequency;
  /** Only meaningful for 'weekly'/'custom' — 'daily' always means every day, 'off' means none. */
  days: Day[];
  /** Only meaningful for 'custom' — every other frequency repeats weekly (interval 1). */
  interval: number;
  end: EndCondition;
  /** Ongoing weekly pattern vs. a one-time arrangement — see `ChecklistTemplate['repeat'].recurring`'s
   * own comment. Independent of `frequency`/`end`: a schedule can occur on several days within one
   * bounded window (e.g. every day this week, `end` an `onDate` a week out) and still not be meant
   * as a recurring pattern past that. */
  recurring: boolean;
};

const ALL_DAYS = WEEK_DAYS.map(d => d.value);

/** Today's `Day`, for defaulting a freshly-picked Weekly/Custom frequency's day selection instead
 * of leaving the day-pill picker empty with nothing to save — `getDay()` is Sunday=0..Saturday=6,
 * matching `ICAL_WEEKDAY_ORDER`'s own Sunday-first order 1:1, so indexing into it needs no
 * separate day-number mapping table. */
export const todayDay = (): Day => icalToDay(ICAL_WEEKDAY_ORDER[new Date().getDay()]) ?? Day.Sun;

type RepeatLike = { byday?: string; interval?: number; until?: string; count?: number; recurring?: boolean };

const isEveryDay = (byday: string): boolean =>
  new Set(byday.split(',').map(d => d.trim()).filter(Boolean)).size === 7;

/**
 * Derives the picker's own frequency/interval/end state from a stored `repeat` (template or field
 * group shape — both structurally compatible here). The reverse direction isn't a symmetric
 * function: `calculateRepeat`/`buildFieldGroupRepeat` already build the real byday/freq/interval/
 * until/count patch from days+extras (see `recurrenceValueToExtra` below for the piece they still
 * need from a `RecurrenceValue`), so duplicating that logic here would just be a second place for
 * the two to drift apart.
 */
export const repeatToRecurrenceValue = (
  repeat: RepeatLike | undefined,
  allowNoRepeat: boolean,
  // false for the template-level picker (ChecklistGenericInfo, RecurrencePicker's own
  // showOnDateEnd={false}) — `until` is edited entirely in the merged Start/End Date dialog there
  // instead, so deriving `end` from it here would mask a real `count` the moment `until` also
  // happens to be set (this function otherwise prefers `until` over `count`), even though the user
  // never touched the Ends section. Keeps the two fields' derivations fully independent.
  respectUntil = true,
): RecurrenceValue => {
  const byday = repeat?.byday ?? '';
  const days = byday
    ? byday.split(',').map(c => icalToDay(c.trim())).filter((d): d is Day => d !== undefined)
    : [];
  const end: EndCondition =
    respectUntil && repeat?.until
      ? { type: 'onDate', until: repeat.until }
      : repeat?.count != null
        ? { type: 'after', count: repeat.count }
        : { type: 'never' };
  const recurring = isRecurringSchedule(repeat);

  if (!byday) {
    // Absent byday means "off" for a template (no schedule at all) but "every day" for a field
    // group (see fieldGroupTypes.ts's own doc comment "Absent... means every day") — allowNoRepeat
    // is exactly that switch, same one the picker itself uses to hide "Does not repeat".
    return allowNoRepeat
      ? { frequency: 'off', days: [], interval: 1, end: { type: 'never' }, recurring: true }
      : { frequency: 'daily', days: ALL_DAYS, interval: 1, end, recurring };
  }
  if (repeat?.interval && repeat.interval !== 1) {
    return { frequency: 'custom', days, interval: repeat.interval, end, recurring };
  }
  if (isEveryDay(byday)) {
    return { frequency: 'daily', days, interval: 1, end, recurring };
  }
  return { frequency: 'weekly', days, interval: 1, end, recurring };
};

/** The `{interval, until, count, recurring}` slice every save path threads into calculateRepeat's/
 * buildFieldGroupRepeat's own `extra` param — one place for "interval only applies to Custom" and
 * "which end field is actually set," so no call site re-derives that switch by hand. */
export const recurrenceValueToExtra = (
  value: RecurrenceValue,
): { interval?: number; until?: string; count?: number; recurring: boolean } => ({
  interval: value.frequency === 'custom' ? value.interval : undefined,
  until: value.end.type === 'onDate' ? value.end.until : undefined,
  count: value.end.type === 'after' ? value.end.count : undefined,
  recurring: value.recurring,
});

/** The day list a save path passes as `weeklyHobbies` — 'daily' always means every day regardless
 * of whatever `days` happened to hold before the frequency was last changed (see RecurrencePicker's
 * own frequency switch, which preserves `days` across a Daily round-trip so a prior custom
 * selection isn't lost if the user switches back), 'off' means none. */
export const recurrenceValueToDays = (value: RecurrenceValue): Day[] => {
  if (value.frequency === 'off') return [];
  if (value.frequency === 'daily') return ALL_DAYS;
  return value.days;
};
