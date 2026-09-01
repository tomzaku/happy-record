import { useIsMobile } from '@dreamer/global';
import WeekViewDesktop from './WeekView.desktop';
import WeekViewMobile from './WeekView.mobile';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag?: string;
};

const WeekView = (props: Props) => {
  const isMobile = useIsMobile();
  return isMobile ? <WeekViewMobile {...props} /> : <WeekViewDesktop {...props} />;
};

export default WeekView;
