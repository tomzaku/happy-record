import { Day } from '@dreamer/tasks-page-common';
import { icalToDay } from '@dreamer/global';

export const getDaysFromRepeat = (repeat?: { byday: string }): Day[] => {
  if (!repeat?.byday) return [new Date().getDay() as Day];
  return repeat.byday.split(',').map(code => icalToDay(code.trim()) ?? Day.Sun);
};
