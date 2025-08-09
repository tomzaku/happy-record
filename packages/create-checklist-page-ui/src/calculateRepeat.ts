import { Day } from '@dreamer/tasks-page-common';

export const calculateRepeat = ({
  weeklyHobbies,
  selectedTime,
  startedAt,
}: {
  weeklyHobbies: Day[];
  selectedTime?: string;
  startedAt?: string;
}) => {
  if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

  // Parse selectedTime if provided, otherwise use defaults
  const [hour = '8', minute = '0'] = selectedTime
    ? selectedTime.split(':')
    : ['8', '0'];

  // Use provided startedAt or fallback to current date
  const startedAtISO = startedAt 
    ? new Date(startedAt).toISOString()
    : new Date().toISOString();

  if (weeklyHobbies.length === 7)
    return {
      startedAt: startedAtISO,
      dayOfWeek: '*',
      minute,
      hour,
      dayOfMonth: '*',
      month: '*',
    };
  return {
    startedAt: startedAtISO,
    minute,
    hour,
    dayOfMonth: '*',
    month: '*',
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
