import { Day } from '@dreamer/tasks-page-common';
export const getDaysFromRepeat = (repeat?: { dayOfWeek: string }): Day[] => {
  if (!repeat?.dayOfWeek) return [new Date().getDay() as Day];
  if (repeat.dayOfWeek === '*')
    return [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  return repeat.dayOfWeek.split(',').map(day => {
    switch (day) {
      case '0':
        return Day.Sun;
      case '1':
        return Day.Mon;
      case '2':
        return Day.Tue;
      case '3':
        return Day.Wed;
      case '4':
        return Day.Thu;
      case '5':
        return Day.Fri;
      case '6':
        return Day.Sat;
      default:
        return Day.Sun;
    }
  });
};
