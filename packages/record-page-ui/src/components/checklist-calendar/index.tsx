import { Icon } from '@iconify/react';
import Typography from '@moon-ui/typography';

import styles from './index.module.scss';

type Props = {
  date: Date;
  onDateChange: (date: Date) => void;
};

const minus1Day = (date: Date) => {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
};
const plus1Day = (date: Date) => {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
};
const ChecklistCalendar = ({ date, onDateChange }: Props) => {
  const isToday =
    new Date(date).toLocaleDateString() === new Date().toLocaleDateString();
  const title = isToday ? 'Tasks Today' : 'Tasks';
  const dateText = isToday ? 'Today' : new Date(date).toLocaleDateString();
  return (
    <div className={styles.container}>
      <Typography.Title level={3} noMargin>
        {title}
      </Typography.Title>
      <div className={styles.player}>
        <Icon
          onClick={() => onDateChange(minus1Day(date))}
          width={30}
          icon="basil:skip-prev-outline"
          className={styles.icon}
        />
        <div
          className={styles.currentContainer}
          onClick={() => onDateChange(new Date())}
        >
          {dateText}
        </div>
        <Icon
          onClick={() => onDateChange(plus1Day(date))}
          width={30}
          icon="basil:skip-next-outline"
          className={styles.icon}
        />
      </div>
    </div>
  );
};

export default ChecklistCalendar;
