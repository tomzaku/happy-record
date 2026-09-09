import { Day } from '@dreamer/tasks-page-common';
import { occursOnDate, nextOccurrenceLabel, ICAL_WEEKDAY_ORDER, ALL_ICAL_DAYS } from './rruleUtils';

export { ALL_ICAL_DAYS };

export interface RepeatSchedule {
  byhour: string;
  byminute: string;
  byday: string;
  startedAt?: string;
  completedAt?: string;
}

/** Whether a schedule is an ongoing weekly pattern vs. a one-time arrangement bounded by its own
 * `startedAt`/`until` (see `ChecklistTemplate['repeat'].recurring`'s own comment for why this is a
 * separate question from "does it eventually stop", which `until`/`count` already answer).
 * Defaults `true` for a schedule that never set this — every schedule before this field existed
 * was an open-ended weekly pattern with no way to mark otherwise. */
export const isRecurringSchedule = (repeat?: { recurring?: boolean }): boolean => repeat?.recurring !== false;

const ICAL_TO_DAY: Record<string, Day> = {
  SU: Day.Sun,
  MO: Day.Mon,
  TU: Day.Tue,
  WE: Day.Wed,
  TH: Day.Thu,
  FR: Day.Fri,
  SA: Day.Sat,
};
const DAY_TO_ICAL: Record<Day, string> = {
  [Day.Sun]: 'SU',
  [Day.Mon]: 'MO',
  [Day.Tue]: 'TU',
  [Day.Wed]: 'WE',
  [Day.Thu]: 'TH',
  [Day.Fri]: 'FR',
  [Day.Sat]: 'SA',
};
export const dayToIcal = (day: Day): string => DAY_TO_ICAL[day];
export const icalToDay = (ical: string): Day | undefined => ICAL_TO_DAY[ical];

const isEveryDayByday = (byday: string): boolean =>
  new Set(byday.split(',').map(d => d.trim()).filter(Boolean)).size === 7;

/**
 * Formats a repeat schedule into a human-readable string
 * @param repeat - The repeat schedule object
 * @returns Formatted schedule string or 'No schedule'
 */
export const formatSchedule = (repeat?: RepeatSchedule): string => {
  if (!repeat || !repeat.byday) {
    return 'No schedule';
  }

  const time = `${repeat.byhour.padStart(2, '0')}:${repeat.byminute.padStart(2, '0')}`;
  const days = formatDaysOfWeek(repeat.byday);

  return `${time} • ${days}`;
};

/**
 * Formats days of the week from the repeat schedule
 * @param byday - Comma-separated string of iCal weekday codes (SU/MO/TU/WE/TH/FR/SA)
 * @returns Formatted day names string
 */
export const formatDaysOfWeek = (byday: string): string => {
  if (!byday) {
    return 'Every day';
  }

  const codes = byday.split(',').map(d => d.trim());
  if (isEveryDayByday(byday)) {
    return 'Every day';
  }

  const dayNames: Record<string, string> = {
    SU: 'Sun',
    MO: 'Mon',
    TU: 'Tue',
    WE: 'Wed',
    TH: 'Thu',
    FR: 'Fri',
    SA: 'Sat',
  };

  const formattedDays = codes.map(code => dayNames[code] || code);
  return formattedDays.join(', ');
};

/**
 * Gets the Day enum values from a repeat schedule
 * @param repeat - The repeat schedule object
 * @returns Array of Day enum values
 */
export const getDaysFromRepeat = (repeat?: RepeatSchedule): Day[] => {
  if (!repeat?.byday) return [Day.Mon]; // Default to Monday if no schedule

  return repeat.byday.split(',').map(code => icalToDay(code.trim()) ?? Day.Mon);
};

/**
 * Formats time from hour and minute strings
 * @param hour - Hour string (0-23)
 * @param minute - Minute string (0-59)
 * @returns Formatted time string (HH:MM)
 */
export const formatTime = (hour?: string, minute?: string): string => {
  if (!hour || !minute) {
    return 'Not set';
  }

  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

/**
 * Whether a field group's own schedule (see FieldGroup.repeat in
 * ../store/checklists/useChecklistTemplates) is due on the given date. No `repeat`, or an absent
 * `byday`, means "every day" — a group scheduled for every day carries the full 7-code
 * `byday` list rather than a shorthand, but `occursOnDate` already evaluates that correctly on
 * its own since a real RRule built from all 7 weekdays matches every calendar day. Only the day
 * matters here (not the hour/minute) since a group's schedule gates which groups show for a
 * given calendar day, not a specific time of day.
 */
export const isFieldGroupActiveOnDay = (
  repeat: { byday: string } | undefined,
  date: Date,
): boolean => {
  if (!repeat?.byday) return true;
  return occursOnDate(repeat, date);
};

/**
 * The next calendar day (strictly after `fromDate`) a field group's own schedule is next due —
 * "Tomorrow" for the very next day, otherwise the short weekday name (e.g. "Wed"). Mirrors
 * isFieldGroupActiveOnDay's day-of-week-only convention. A group with no `repeat`, or a `byday`
 * covering every day, is active every day, so there's no "next" to report — returns undefined,
 * same as a `byday` that (shouldn't, but defensively) names no day at all.
 */
export const getNextScheduledDayLabel = (
  repeat: { byday: string } | undefined,
  fromDate: Date,
): string | undefined => {
  if (!repeat?.byday || isEveryDayByday(repeat.byday)) return undefined;
  return nextOccurrenceLabel(repeat, fromDate);
};

/**
 * The set of days a template's own `Checklist` instance should actually exist on. When the
 * template has field groups, this is *derived* — the union of every group's own `byday` —
 * rather than trusting the template's separately stored `repeat.byday`, so a group can never
 * end up scheduled for a day the template itself doesn't generate a `Checklist` on (which would
 * make that group unreachable, silently — see the "two schedules" note in
 * useChecklistTemplates.tsx). A group with no `repeat`, or a `byday` covering every day, has no
 * day restriction, so it alone forces the whole result to the full 7-code list. A soft-deleted
 * group (`archivedAt` set — see FieldGroup's own comment) never contributes to the union, same as
 * if it weren't in the array at all: an archived group no longer renders, so its schedule
 * shouldn't keep the template generating `Checklist` instances on days nothing else needs. Falls
 * back to the template's own `repeat.byday` when there are no *active* field groups — a plain
 * `completedAt`-only checklist, or a template every one of whose groups has been archived, has
 * nothing left to union.
 *
 * Callers that gate on this (getChecklistTemplateIdsByGivingDate) should always call this rather
 * than reading `repeat.byday` directly — that's what actually keeps the two schedules from
 * drifting apart, not remembering to sync them on every write.
 */
export const getEffectiveDayOfWeek = (template: {
  repeat?: { byday?: string };
  fieldGroups?: { repeat?: { byday?: string }; archivedAt?: string | null }[];
  scheduleMode?: 'general' | 'per_group';
}): string | undefined => {
  if (template.scheduleMode === 'general') return template.repeat?.byday;

  const groups = (template.fieldGroups ?? []).filter(group => !group.archivedAt);
  if (groups.length === 0) return template.repeat?.byday;

  const allDays = new Set<string>();
  for (const group of groups) {
    const byday = group.repeat?.byday;
    if (!byday || isEveryDayByday(byday)) return ALL_ICAL_DAYS;
    for (const day of byday.split(',')) allDays.add(day.trim());
  }
  return ICAL_WEEKDAY_ORDER.filter(code => allDays.has(code)).join(',');
};

/**
 * Whether a template's *schedule* should be derived from its field groups (unioned via
 * getEffectiveDayOfWeek) rather than its own top-level `repeat` — true only when it has active
 * field groups and hasn't opted into one combined schedule (`scheduleMode: 'general'`, chosen in
 * ChecklistGenericInfo's Schedule modal). Every place that used to gate a *scheduling* decision on
 * "does this template have active field groups" should call this instead of
 * `getActiveFieldGroups(...).length > 0` directly, so 'general' mode consistently makes a
 * field-group template behave exactly like one with none, everywhere — not just in the modal that
 * sets it. Rendering the groups themselves (not their schedule) is unaffected and keeps using plain
 * `getActiveFieldGroups`.
 */
export const hasGroupSchedule = (template: {
  scheduleMode?: 'general' | 'per_group';
  fieldGroups?: { archivedAt?: string | null }[];
}): boolean => {
  if (template.scheduleMode === 'general') return false;
  return (template.fieldGroups ?? []).some(group => !group.archivedAt);
};

/**
 * Formats tags array into a readable string
 * @param tags - Array of tag strings
 * @returns Formatted tags string or 'No tags'
 */
export const formatTags = (tags?: string[]): string => {
  if (!tags || tags.length === 0) {
    return 'No tags';
  }

  return tags.join(', ');
};
