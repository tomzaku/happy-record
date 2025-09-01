import { useIsMobile } from '@dreamer/global';

import WeeklyCalendarHorizontal  from './WeeklyCalendarHorizontal';
import WeeklyCalendarVertical  from './WeeklyCalendarVertical';

const WeeklyCalendar = (props: any) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <WeeklyCalendarHorizontal {...props} />
  } else {
    return <WeeklyCalendarVertical {...props} />
  }
}

export default WeeklyCalendar
