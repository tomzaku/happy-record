import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { useIntl } from '@dreamer/translation';
import { useChecklist } from '@dreamer/global';
import {
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import styles from './YearView.module.scss';

type Props = {
  currentDate: Date;
  onDaySelect: (date: Date) => void;
  selectedTag?: string;
  /** See week-view's own Props comment — scopes every cell to one template. */
  checklistTemplateId?: string;
};

// 0 = nothing scheduled, 1 = scheduled but 0% done, 2 = partially done, 3 = fully done —
// mirrors a GitHub contribution heatmap, but "activity" here is completion, not creation.
const completionLevel = (total: number, completed: number): 0 | 1 | 2 | 3 => {
  if (total === 0) return 0;
  if (completed === 0) return 1;
  if (completed < total) return 2;
  return 3;
};

const YearView = ({ currentDate, onDaySelect, selectedTag, checklistTemplateId }: Props) => {
  const intl = useIntl();
  const { getChecklistForDateWithoutFetching, ensureChecklistsFetched } = useChecklist();
  const [visibleYear, setVisibleYear] = React.useState(() => startOfYear(currentDate));

  const yearStart = React.useMemo(() => startOfYear(visibleYear), [visibleYear]);
  const yearEnd = React.useMemo(() => endOfYear(visibleYear), [visibleYear]);
  const months = React.useMemo(
    () => eachMonthOfInterval({ start: yearStart, end: yearEnd }),
    [yearStart, yearEnd],
  );

  React.useEffect(() => {
    ensureChecklistsFetched({ from: yearStart, to: yearEnd });
  }, [yearStart, yearEnd, ensureChecklistsFetched]);

  const levelByDay = React.useMemo(() => {
    const levels = new Map<string, 0 | 1 | 2 | 3>();
    eachDayOfInterval({ start: yearStart, end: yearEnd }).forEach(date => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      const tasks = Object.values(checklist).filter(
        task => !checklistTemplateId || task.checklistTemplateId === checklistTemplateId,
      );
      const completed = tasks.filter(task => task.completedAt).length;
      levels.set(date.toISOString().split('T')[0], completionLevel(tasks.length, completed));
    });
    return levels;
  }, [yearStart, yearEnd, getChecklistForDateWithoutFetching, selectedTag, checklistTemplateId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.navigation}>
          <Icon
            onClick={() => setVisibleYear(prev => startOfYear(new Date(prev.getFullYear() - 1, 0, 1)))}
            width={20}
            icon="basil:skip-prev-outline"
            className={styles.navIcon}
          />
          <Typography.Text className={styles.yearLabel}>{format(visibleYear, 'yyyy')}</Typography.Text>
          <Icon
            onClick={() => setVisibleYear(prev => startOfYear(new Date(prev.getFullYear() + 1, 0, 1)))}
            width={20}
            icon="basil:skip-next-outline"
            className={styles.navIcon}
          />
        </div>
        <Button onClick={() => setVisibleYear(startOfYear(new Date()))} className={styles.todayButton}>
          {intl.formatMessage({ id: 'year-view.this-year', defaultMessage: 'This year' })}
        </Button>
      </div>

      <div className={styles.monthsGrid}>
        {months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
          const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
          const gridDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

          return (
            <div key={month.toISOString()} className={styles.miniMonth}>
              <Typography.Text className={styles.miniMonthLabel}>{format(month, 'MMM')}</Typography.Text>
              <div className={styles.miniGrid}>
                {gridDays.map(date => {
                  const dateKey = date.toISOString().split('T')[0];
                  const inMonth = isSameMonth(date, month);
                  const level = inMonth ? levelByDay.get(dateKey) ?? 0 : undefined;

                  return (
                    <div
                      key={dateKey}
                      className={`${styles.dayCell} ${inMonth ? styles[`level${level}`] : styles.outsideMonth} ${
                        isToday(date) ? styles.today : ''
                      }`}
                      title={inMonth ? format(date, 'MMM d, yyyy') : undefined}
                      onClick={() => inMonth && onDaySelect(date)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        <Typography.Text className={styles.legendLabel}>
          {intl.formatMessage({ id: 'year-view.legend-less', defaultMessage: 'Less' })}
        </Typography.Text>
        {[0, 1, 2, 3].map(level => (
          <span key={level} className={`${styles.legendSwatch} ${styles[`level${level}`]}`} />
        ))}
        <Typography.Text className={styles.legendLabel}>
          {intl.formatMessage({ id: 'year-view.legend-more', defaultMessage: 'More' })}
        </Typography.Text>
      </div>
    </div>
  );
};

export default YearView;
