import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addDays,
  subDays,
} from 'date-fns';

import styles from './index.module.scss';

type Props = {
  currentDay: string;
};

const WeeklyRow = ({ currentDay }: Props) => {
  const [search, setSearchParams] = useSearchParams();

  const currentDate = new Date(currentDay);

  // Get the week range for the current date
  const weekStart = React.useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }), // Monday start
    [currentDate],
  );
  const weekEnd = React.useMemo(
    () => endOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate],
  );
  const weekDays = React.useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  const handlePrevWeek = React.useCallback(() => {
    const prevWeek = subDays(currentDate, 7);
    setSearchParams({
      ...Object.fromEntries(search),
      currentDay: prevWeek.toISOString(),
    });
  }, [currentDate, search, setSearchParams]);

  const handleNextWeek = React.useCallback(() => {
    const nextWeek = addDays(currentDate, 7);
    setSearchParams({
      ...Object.fromEntries(search),
      currentDay: nextWeek.toISOString(),
    });
  }, [currentDate, search, setSearchParams]);

  const handleDayClick = React.useCallback(
    (date: Date) => {
      setSearchParams({
        ...Object.fromEntries(search),
        currentDay: date.toISOString(),
      });
    },
    [search, setSearchParams],
  );

  return (
    <div className={styles.container}>
      <Icon
        onClick={handlePrevWeek}
        width={20}
        icon="basil:skip-prev-outline"
        className={styles.navIcon}
      />
      <div className={styles.weekGrid}>
        {weekDays.map((date, index) => {
          const isCurrentDay = isToday(date);
          const isSelected = isSameDay(date, currentDate);
          const isTodayDate = isToday(date);

          return (
            <div
              key={index}
              className={`${styles.dayColumn} ${isCurrentDay ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
              onClick={() => handleDayClick(date)}
            >
              <div className={styles.dayHeader}>
                <Typography.Text className={styles.dayName}>
                  {format(date, 'EEE')}
                </Typography.Text>
                <Typography.Text className={styles.dayNumber}>
                  {format(date, 'd')}
                </Typography.Text>
                {isTodayDate && <div className={styles.todayIndicator} />}
              </div>
            </div>
          );
        })}
      </div>
      <Icon
        onClick={handleNextWeek}
        width={20}
        icon="basil:skip-next-outline"
        className={styles.navIcon}
      />
    </div>
  );
};

export default WeeklyRow;
