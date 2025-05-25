import { Day } from '@dreamer/tasks-page-common';
export const getDay = () => {
  const today = new Date();
  const days = [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  return days[today.getDay()];
};
