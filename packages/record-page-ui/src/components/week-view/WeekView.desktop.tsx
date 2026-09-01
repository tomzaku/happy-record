import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { useIntl } from '@dreamer/translation';
import { useChecklist, useChecklistTemplates, Checklist } from '@dreamer/global';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns';
import styles from './WeekView.desktop.module.scss';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag?: string;
};

const WeekViewDesktop = ({ currentDate, onDateChange, selectedTag }: Props) => {
  const intl = useIntl();
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();

  const weekStart = React.useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = React.useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = React.useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd],
  );

  React.useEffect(() => {
    ensureChecklistsFetched({ from: weekStart, to: weekEnd });
  }, [weekStart, weekEnd, ensureChecklistsFetched]);

  const tasksByDay = React.useMemo(() => {
    const tasksMap = new Map<string, Checklist[]>();
    weekDays.forEach(date => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      tasksMap.set(date.toISOString().split('T')[0], Object.values(checklist));
    });
    return tasksMap;
  }, [weekDays, getChecklistForDateWithoutFetching, selectedTag]);

  const handlePrevWeek = React.useCallback(() => {
    onDateChange(subWeeks(currentDate, 1));
  }, [currentDate, onDateChange]);

  const handleNextWeek = React.useCallback(() => {
    onDateChange(addWeeks(currentDate, 1));
  }, [currentDate, onDateChange]);

  const weekRangeLabel = React.useMemo(() => {
    const startMonth = format(weekStart, 'MMM');
    const endMonth = format(weekEnd, 'MMM');
    const year = format(weekStart, 'yyyy');
    return startMonth === endMonth
      ? `${startMonth} ${format(weekStart, 'd')}-${format(weekEnd, 'd')}, ${year}`
      : `${startMonth} ${format(weekStart, 'd')} - ${endMonth} ${format(weekEnd, 'd')}, ${year}`;
  }, [weekStart, weekEnd]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Icon onClick={handlePrevWeek} width={20} icon="basil:skip-prev-outline" className={styles.navIcon} />
          <Typography.Text className={styles.weekRange}>{weekRangeLabel}</Typography.Text>
          <Icon onClick={handleNextWeek} width={20} icon="basil:skip-next-outline" className={styles.navIcon} />
        </div>
        <Button onClick={() => onDateChange(new Date())} className={styles.todayButton}>
          {intl.formatMessage({ id: 'week-view.today', defaultMessage: 'Today' })}
        </Button>
      </div>

      <div className={styles.grid}>
        {weekDays.map(date => {
          const dateKey = date.toISOString().split('T')[0];
          const dayTasks = tasksByDay.get(dateKey) || [];
          const isCurrentDay = isToday(date);
          const isSelected = isSameDay(date, currentDate);

          return (
            <div
              key={dateKey}
              className={`${styles.dayColumn} ${isCurrentDay ? styles.today : ''} ${isSelected ? styles.selected : ''}`}
              onClick={() => onDateChange(date)}
            >
              <div className={styles.dayHeader}>
                <Typography.Text className={styles.dayName}>{format(date, 'EEE')}</Typography.Text>
                <Typography.Title level={4} noMargin className={styles.dayNumber}>
                  {format(date, 'd')}
                </Typography.Title>
              </div>

              <div className={styles.tasksContainer}>
                {dayTasks.length === 0 ? (
                  <Typography.Text className={styles.emptyText}>
                    {intl.formatMessage({ id: 'week-view.no-tasks', defaultMessage: 'No tasks' })}
                  </Typography.Text>
                ) : (
                  dayTasks.map(task => {
                    const template = checklistTemplate[task.checklistTemplateId];
                    return (
                      <div key={task.id} className={styles.taskItem}>
                        <Icon
                          color={template?.avatar.color || '#8A8A8A'}
                          width={16}
                          height={16}
                          icon={template?.avatar.name}
                        />
                        <Typography.Text className={styles.taskTitle}>{template?.title}</Typography.Text>
                        {task.completedAt && (
                          <Icon icon="solar:check-circle-bold" width={14} className={styles.completedIcon} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekViewDesktop;
