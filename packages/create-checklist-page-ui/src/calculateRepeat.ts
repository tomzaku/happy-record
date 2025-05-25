import { Day } from '@dreamer/tasks-page-common';

export const calculateRepeat = ({
  weeklyHobbies,
}: {
  weeklyHobbies: Day[];
}) => {
  if (!weeklyHobbies || weeklyHobbies.length === 0) return undefined;

  if (weeklyHobbies.length === 7)
    return {
      startedAt: new Date().toISOString(),
      dayOfWeek: '*',
      minute: '0',
      hour: '8',
      dayOfMonth: '*',
      month: '*',
    };
  return {
    startedAt: new Date().toISOString(),
    minute: '0',
    hour: '8',
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
