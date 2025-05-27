import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';

import styles from './index.module.scss';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { useIntl } from '@dreamer/translation';

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
  const intl = useIntl();
  const isToday =
    new Date(date).toLocaleDateString() === new Date().toLocaleDateString();
  const dateText = isToday
    ? intl.formatMessage({
        id: 'checklist-calendar.today',
        defaultMessage: 'Today',
      })
    : new Date(date).toLocaleDateString();
  return (
    <div className={styles.container}>
      <Typography.Title level={4} noMargin className={styles.title}>
        {intl.formatMessage({
          id: 'checklist-calendar.title',
          defaultMessage: 'Tasks',
        })}
      </Typography.Title>
      <div className={styles.player}>
        <Icon
          onClick={() => onDateChange(minus1Day(date))}
          width={30}
          icon="basil:skip-prev-outline"
          className={styles.icon}
        />
        <Typography.Text
          className={styles.currentContainer}
          onClick={() => onDateChange(new Date())}
        >
          {dateText}
        </Typography.Text>
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
