import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { useIntl } from '@dreamer/translation';
import { useChecklist, useChecklistTemplates, Checklist } from '@dreamer/global';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import styles from './MonthView.module.scss';

type Props = {
  currentDate: Date;
  onDaySelect: (date: Date) => void;
  selectedTag?: string;
  /** See week-view's own Props comment — scopes every cell to one template. */
  checklistTemplateId?: string;
};

const MAX_CHIPS_PER_DAY = 3;
const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const MonthView = ({ currentDate, onDaySelect, selectedTag, checklistTemplateId }: Props) => {
  const intl = useIntl();
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(currentDate));

  const monthStart = React.useMemo(() => startOfMonth(visibleMonth), [visibleMonth]);
  const monthEnd = React.useMemo(() => endOfMonth(visibleMonth), [visibleMonth]);
  const gridStart = React.useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const gridEnd = React.useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const gridDays = React.useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  React.useEffect(() => {
    ensureChecklistsFetched({ from: gridStart, to: gridEnd });
  }, [gridStart, gridEnd, ensureChecklistsFetched]);

  const tasksByDay = React.useMemo(() => {
    const tasksMap = new Map<string, Checklist[]>();
    gridDays.forEach(date => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      const tasks = Object.values(checklist).filter(
        task => !checklistTemplateId || task.checklistTemplateId === checklistTemplateId,
      );
      tasksMap.set(date.toISOString().split('T')[0], tasks);
    });
    return tasksMap;
  }, [gridDays, getChecklistForDateWithoutFetching, selectedTag, checklistTemplateId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Icon
            onClick={() => setVisibleMonth(prev => subMonths(prev, 1))}
            width={20}
            icon="basil:skip-prev-outline"
            className={styles.navIcon}
          />
          <Typography.Text className={styles.monthLabel}>
            {format(visibleMonth, 'MMMM yyyy')}
          </Typography.Text>
          <Icon
            onClick={() => setVisibleMonth(prev => addMonths(prev, 1))}
            width={20}
            icon="basil:skip-next-outline"
            className={styles.navIcon}
          />
        </div>
        <Button
          onClick={() => setVisibleMonth(startOfMonth(new Date()))}
          className={styles.todayButton}
        >
          {intl.formatMessage({ id: 'month-view.today', defaultMessage: 'Today' })}
        </Button>
      </div>

      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map(label => (
          <Typography.Text key={label} className={styles.weekdayLabel}>
            {label}
          </Typography.Text>
        ))}
      </div>

      <div className={styles.grid}>
        {gridDays.map(date => {
          const dateKey = date.toISOString().split('T')[0];
          const dayTasks = tasksByDay.get(dateKey) || [];
          const visibleTasks = dayTasks.slice(0, MAX_CHIPS_PER_DAY);
          const overflowCount = dayTasks.length - visibleTasks.length;

          return (
            <div
              key={dateKey}
              className={`${styles.cell} ${!isSameMonth(date, visibleMonth) ? styles.outsideMonth : ''} ${
                isToday(date) ? styles.today : ''
              } ${isSameDay(date, currentDate) ? styles.selected : ''}`}
              onClick={() => onDaySelect(date)}
            >
              <Typography.Text className={styles.dayNumber}>{format(date, 'd')}</Typography.Text>
              <div className={styles.chips}>
                {visibleTasks.map(task => {
                  const template = checklistTemplate[task.checklistTemplateId];
                  return (
                    <div key={task.id} className={`${styles.chip} ${task.completedAt ? styles.chipCompleted : ''}`}>
                      <span
                        className={styles.chipDot}
                        style={{ background: template?.avatar.color || '#8A8A8A' }}
                      />
                      <Typography.Text className={styles.chipTitle}>{template?.title}</Typography.Text>
                      {task.completedAt && (
                        <Icon icon="solar:check-circle-bold" width={12} className={styles.completedIcon} />
                      )}
                    </div>
                  );
                })}
                {overflowCount > 0 && (
                  <Typography.Text className={styles.moreLabel}>
                    {intl.formatMessage(
                      { id: 'month-view.more', defaultMessage: '+{{count}} more' },
                      { count: overflowCount },
                    )}
                  </Typography.Text>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;
