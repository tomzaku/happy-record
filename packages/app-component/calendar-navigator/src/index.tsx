import { Icon } from '@moon-ui/icon/Icon';

import styles from './index.module.scss';

type Props = {
  date: Date;
  onDateChange: (date: Date) => void;
  getText: ({ isToday }: { isToday: boolean }) => string;
};

const minus1Day = (date: Date) => {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
};
const plus1Day = (date: Date) => {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
};
const CalendarNavigator = ({ date, onDateChange, getText }: Props) => {
  const isToday =
    new Date(date).toLocaleDateString() === new Date().toLocaleDateString();
  return (
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
        {getText({ isToday })}
      </div>
      <Icon
        onClick={() => onDateChange(plus1Day(date))}
        width={30}
        icon="basil:skip-next-outline"
        className={styles.icon}
      />
    </div>
  );
};

export default CalendarNavigator;
