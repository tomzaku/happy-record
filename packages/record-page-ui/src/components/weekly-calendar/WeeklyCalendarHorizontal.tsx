import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Card from '@moon-ui/card';
import { useIntl } from '@dreamer/translation';
import { useChecklist } from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
} from 'date-fns';
import CalendarDialog from '../checklist-calendar/CalendarDialog';

import styles from './index.module.scss';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag?: string;
};

const WeeklyCalendarHorizontal = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const [showCalendarDialog, setShowCalendarDialog] = React.useState(false);

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

  // One fetch for the whole visible week instead of one per day — see
  // WeeklyCalendarVertical's own comment on the same pattern.
  React.useEffect(() => {
    ensureChecklistsFetched({ from: weekStart, to: weekEnd });
  }, [weekStart, weekEnd, ensureChecklistsFetched]);

  // A day's status dot — 'done' (every task completed), 'pending' (at least one isn't), or
  // `undefined` (nothing scheduled at all, no dot). Replaces this strip's old per-day mini task
  // list (icon + title + "+N more") — showing 7 columns' worth of task titles at once was more
  // noise than a glance actually needs; the dot is the same "is this day handled" signal
  // mini-month-calendar's own day cells already give the right-sidebar/desktop calendar.
  const dayStatusByDate = React.useMemo(() => {
    const statusMap = new Map<string, 'done' | 'pending' | undefined>();

    weekDays.forEach(date => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      const items = Object.values(checklist);
      const status = items.length === 0 ? undefined : items.every(item => item.completedAt) ? 'done' : 'pending';
      statusMap.set(date.toISOString().split('T')[0], status);
    });

    return statusMap;
    // `getChecklistTemplateIdsByGivingDate`/`getChecklistTemplate` aren't
    // actually called in this memo — `getChecklistForDateWithoutFetching` is,
    // and was missing here, which meant a checklist synced/edited elsewhere
    // (or even completed on this same device, in the same session) never
    // refreshed this week's status.
  }, [weekDays, getChecklistForDateWithoutFetching, selectedTag]);

  const handlePrevWeek = React.useCallback(() => {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    onDateChange(prevWeek);
  }, [currentDate, onDateChange]);

  const handleNextWeek = React.useCallback(() => {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    onDateChange(nextWeek);
  }, [currentDate, onDateChange]);

  const handleDayClick = React.useCallback(
    (date: Date) => {
      onDateChange(date);
    },
    [onDateChange],
  );

  const handleWeekRangeClick = React.useCallback(() => {
    setShowCalendarDialog(true);
  }, []);

  const handleDateSelect = React.useCallback(
    (date: Date) => {
      onDateChange(date);
      setShowCalendarDialog(false);
    },
    [onDateChange],
  );

  const handleCloseCalendarDialog = React.useCallback(() => {
    setShowCalendarDialog(false);
  }, []);

  const formatWeekRange = React.useMemo(() => {
    const startMonth = format(weekStart, 'MMM');
    const endMonth = format(weekEnd, 'MMM');
    const startDay = format(weekStart, 'd');
    const endDay = format(weekEnd, 'd');
    const year = format(weekStart, 'yyyy');

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  }, [weekStart, weekEnd]);

  return (
    <>
      <CalendarDialog
        selectedDate={currentDate}
        onDateSelect={handleDateSelect}
        onClose={handleCloseCalendarDialog}
        isOpen={showCalendarDialog}
      />
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Icon
            onClick={handlePrevWeek}
            width={24}
            icon="basil:skip-prev-outline"
            className={styles.navIcon}
          />
          <Typography.Text
            className={styles.weekRange}
            onClick={handleWeekRangeClick}
          >
            {formatWeekRange}
          </Typography.Text>
          <Icon
            onClick={handleNextWeek}
            width={24}
            icon="basil:skip-next-outline"
            className={styles.navIcon}
          />
        </div>
      </div>

      <div className={styles.weekGrid}>
        {weekDays.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayStatus = dayStatusByDate.get(dateKey);
          const isCurrentDay = isToday(date);
          const isSelected = isSameDay(date, currentDate);

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
              </div>
              {dayStatus && <span className={styles.dayStatusDot} data-level={dayStatus} />}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default WeeklyCalendarHorizontal;
