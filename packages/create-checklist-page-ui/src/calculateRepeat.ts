import { Day } from '@dreamer/tasks-page-common';
import { getClientTimezone, ICAL_WEEKDAY_ORDER, dayToIcal } from '@dreamer/global';

export const calculateRepeat = ({
  weeklyHobbies,
  selectedTime,
  startedAt,
  interval,
  until,
  count,
  allDay,
  recurring,
  durationMinutes,
}: {
  weeklyHobbies: Day[];
  selectedTime?: string;
  // Always a full ISO instant when provided — every caller converts its own raw input (a bare
  // `yyyy-MM-dd` off a date input) via `localDateStringToISO` before it ever reaches here (see
  // createTaskUtil.ts's `effectiveStartedAt`, EditChecklistForm.tsx's onSubmit).
  startedAt?: string;
  // "Repeat every N weeks" (RecurrencePicker's Custom frequency only — see recurrenceConfig.ts's
  // `recurrenceValueToExtra`), an end date, or a stop-after-N-occurrences count. All three are
  // omitted from the return value when absent/1, same as the server's own `fromRepeat` — a caller
  // that never sets these keeps getting exactly the shape it always did.
  interval?: number;
  until?: string;
  count?: number;
  /** How long each occurrence lasts, in minutes — see ChecklistTemplate['repeat'].durationMinutes'
   * own comment. No UI sets this yet, same as `interval`/`count`. */
  durationMinutes?: number;
  /** Google-Calendar-style "All Day" — forces byhour/byminute to `''` regardless of
   * `selectedTime`, instead of the 8am fallback below. That fallback is for a caller with no
   * explicit all-day concept (SchedulingGroup's create-task flow, where leaving Time blank has
   * always quietly meant "8am"); ChecklistGenericInfo's merged Start/End Date dialog needs a real,
   * distinct "no time at all" state instead, which byhour/byminute already represent end to end
   * (see supabase/shared/schedules.ts's `fromRepeat`). */
  allDay?: boolean;
  /** Ongoing weekly pattern vs. a one-time arrangement (see `ChecklistTemplate['repeat'].recurring`'s
   * own comment) — defaults `true`, same as every caller that predates this field. */
  recurring?: boolean;
}) => {
  if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

  const [hour = '8', minute = '0'] = allDay
    ? ['', '']
    : selectedTime
      ? selectedTime.split(':')
      : ['8', '0'];

  const startedAtISO = startedAt ?? new Date().toISOString();
  const timezone = getClientTimezone();

  return {
    startedAt: startedAtISO,
    byminute: minute,
    byhour: hour,
    freq: 'WEEKLY',
    timezone,
    byday:
      weeklyHobbies.length === 7
        ? ICAL_WEEKDAY_ORDER.join(',')
        : weeklyHobbies.map(dayToIcal).join(','),
    ...(interval && interval !== 1 ? { interval } : {}),
    ...(until ? { until } : {}),
    ...(count != null ? { count } : {}),
    ...(recurring === false ? { recurring: false } : {}),
    ...(durationMinutes ? { durationMinutes } : {}),
  };
};
