import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useState } from 'react';

import styles from './index.module.scss';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import { useIntl } from '@dreamer/translation';
import CalendarDialog from './CalendarDialog';

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
  const [showCalendar, setShowCalendar] = useState(false);
  const isToday =
    new Date(date).toLocaleDateString() === new Date().toLocaleDateString();
  const dateText = isToday
    ? intl.formatMessage({
        id: 'checklist-calendar.today',
        defaultMessage: 'Today',
      })
    : new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  const handleDateClick = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (selectedDate: Date) => {
    onDateChange(selectedDate);
    setShowCalendar(false);
  };

  const handleCloseCalendar = () => {
    setShowCalendar(false);
  };

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
          width={24}
          icon="basil:skip-prev-outline"
          className={styles.icon}
        />
        <Typography.Paragraph
          className={styles.currentContainer}
          onClick={handleDateClick}
          style={{ cursor: 'pointer' }}
          noMargin
        >
          {dateText}
        </Typography.Paragraph>
        <Icon
          onClick={() => onDateChange(plus1Day(date))}
          width={24}
          icon="basil:skip-next-outline"
          className={styles.icon}
        />
      </div>

      <CalendarDialog
        selectedDate={date}
        onDateSelect={handleDateSelect}
        onClose={handleCloseCalendar}
        isOpen={showCalendar}
      />
    </div>
  );
};

export default ChecklistCalendar;
