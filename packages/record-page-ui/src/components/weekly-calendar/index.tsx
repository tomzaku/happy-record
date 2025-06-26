import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Card from '@moon-ui/card';
import { useIntl } from '@dreamer/translation';
import {
  useChecklist,
  useChecklistTemplates,
  Checklist,
} from '@dreamer/global';
import { useNavigate } from 'react-router-dom';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
} from 'date-fns';

import styles from './index.module.scss';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
};

const WeeklyCalendar = ({ currentDate, onDateChange }: Props) => {
  const { getChecklistByGivingDate } = useChecklist();
  const { getChecklistTemplate, getChecklistTemplateIdsByGivingDate } =
    useChecklistTemplates();

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

  // Memoize tasks for each day to prevent unnecessary re-renders
  const tasksByDay = React.useMemo(() => {
    const tasksMap = new Map();

    weekDays.forEach(date => {
      const { checklist } = getChecklistByGivingDate({ date });
      tasksMap.set(date.toISOString().split('T')[0], Object.values(checklist));
    });

    return tasksMap;
  }, [weekDays, getChecklistTemplateIdsByGivingDate, getChecklistTemplate]);

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
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Icon
            onClick={handlePrevWeek}
            width={24}
            icon="basil:skip-prev-outline"
            className={styles.navIcon}
          />
          <Typography.Text className={styles.weekRange}>
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
          const dayTasks = tasksByDay.get(dateKey) || [];
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

              <div className={styles.tasksContainer}>
                {dayTasks.slice(0, 3).map((task: Checklist) => {
                  const template = getChecklistTemplate(
                    task.checklistTemplateId,
                  );
                  return (
                    <div key={task.id} className={styles.taskItem}>
                      <Icon
                        color={template?.avatar.color || '#8A8A8A'}
                        width={16}
                        height={16}
                        icon={template?.avatar.name}
                      />
                      <Typography.Text className={styles.taskTitle}>
                        {template?.title}
                      </Typography.Text>
                      {task.completedAt && (
                        <div className={styles.completedIndicator} />
                      )}
                    </div>
                  );
                })}
                {dayTasks.length > 3 && (
                  <Typography.Text className={styles.moreTasks}>
                    +{dayTasks.length - 3} more
                  </Typography.Text>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default WeeklyCalendar;
