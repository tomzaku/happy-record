import { Day } from '@dreamer/tasks-page-common';
import { getClientTimezone, ICAL_WEEKDAY_ORDER, dayToIcal } from '@dreamer/global';

export const calculateRepeat = ({
  weeklyHobbies,
  selectedTime,
  startedAt,
}: {
  weeklyHobbies: Day[];
  selectedTime?: string;
  // Always a full ISO instant when provided — every caller converts its own raw input (a bare
  // `yyyy-MM-dd` off a date input) via `localDateStringToISO` before it ever reaches here (see
  // createTaskUtil.ts's `effectiveStartedAt`, EditChecklistForm.tsx's onSubmit).
  startedAt?: string;
}) => {
  if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

  // Parse selectedTime if provided, otherwise use defaults
  const [hour = '8', minute = '0'] = selectedTime
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
  };
};
