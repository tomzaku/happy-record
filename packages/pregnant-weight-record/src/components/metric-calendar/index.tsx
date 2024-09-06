import React from 'react';
import CalendarNavigator from '@dreamer/calendar-navigator';
import { useBodyMetric } from '@dreamer/global';
import styles from './index.module.scss';

const MetricCalendar = () => {
  const [date, setDate] = React.useState(new Date());
  const { updateCurrentBodyMetric } = useBodyMetric();
  const onDateChange = (newDate: Date) => {
    setDate(newDate);
    updateCurrentBodyMetric({ date: newDate });
  };
  return (
    <div className={styles.container}>
      <CalendarNavigator
        date={date}
        onDateChange={onDateChange}
        getText={({ isToday }) =>
          isToday ? 'Today' : new Date(date).toLocaleDateString()
        }
      />
    </div>
  );
};

export default MetricCalendar;
