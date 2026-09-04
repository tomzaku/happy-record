import { Day } from '@dreamer/tasks-page-common';
import { getClientTimezone } from '@dreamer/global';

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

  if (weeklyHobbies.length === 7)
    return {
      startedAt: startedAtISO,
      dayOfWeek: '*',
      minute,
      hour,
      dayOfMonth: '*',
      month: '*',
      timezone,
    };
  return {
    startedAt: startedAtISO,
    minute,
    hour,
    dayOfMonth: '*',
    month: '*',
    timezone,
    dayOfWeek: weeklyHobbies
      .map(day => {
        switch (day) {
          case Day.Mon:
            return '1';
          case Day.Tue:
            return '2';
          case Day.Wed:
            return '3';
          case Day.Thu:
            return '4';
          case Day.Fri:
            return '5';
          case Day.Sat:
            return '6';
          case Day.Sun:
            return '0';
        }
      })
      .join(','),
  };
};
