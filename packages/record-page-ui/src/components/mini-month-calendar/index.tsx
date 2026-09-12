import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useChecklist } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import styles from './index.module.scss';

type Props = {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedTag?: string;
  /** Hide the header's own "Today" button — for a consumer (e.g. `HomeCalendar`'s quick-jump
   * `dayPanel`) that already sits next to another Today button (the calendar toolbar's own),
   * where a second one right beside it is redundant. Defaults to shown, matching every other
   * consumer of this panel. */
  showTodayButton?: boolean;
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// A compact, always-inline month grid for the home page's calendar panel —
// distinct from CalendarDialogDesktop (a full modal "jump to a date"
// picker reused elsewhere) since this one also needs to show which days
// have anything recorded (the small dot), which that dialog never needed.
const MiniMonthCalendar = ({ currentDate, onDateChange, selectedTag, showTodayButton = true }: Props) => {
  const intl = useIntl();
  const { ensureChecklistsFetched, getChecklistForDateWithoutFetching } = useChecklist();
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(currentDate));

  React.useEffect(() => {
    setVisibleMonth(startOfMonth(currentDate));
  }, [currentDate]);

  const gridStart = startOfWeek(startOfMonth(visibleMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(visibleMonth), { weekStartsOn: 1 });

  React.useEffect(() => {
    ensureChecklistsFetched({ from: gridStart, to: gridEnd });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureChecklistsFetched, gridStart.getTime(), gridEnd.getTime()]);

  const days = React.useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  // Named apart from the `today` local below (which flags one calendar
  // cell, not this reference point) to avoid the two shadowing each other.
  const todayStart = React.useMemo(() => startOfDay(new Date()), []);

  // `undefined` (nothing scheduled at all) renders no badge.
  const getDotLevel = React.useCallback(
    (date: Date): 'done' | 'pending' | undefined => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      const items = Object.values(checklist);
      if (items.length === 0) return undefined;
      return items.every(item => item.completedAt) ? 'done' : 'pending';
    },
    [getChecklistForDateWithoutFetching, selectedTag],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Typography.Text className={styles.monthLabel}>
            {format(visibleMonth, 'MMMM yyyy')}
          </Typography.Text>
          <div className={styles.navArrows}>
            <Icon
              onClick={() => setVisibleMonth(prev => subMonths(prev, 1))}
              width={16}
              icon="solar:alt-arrow-left-linear"
              className={styles.navIcon}
            />
            <Icon
              onClick={() => setVisibleMonth(prev => addMonths(prev, 1))}
              width={16}
              icon="solar:alt-arrow-right-linear"
              className={styles.navIcon}
            />
          </div>
        </div>
        {showTodayButton && (
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => onDateChange(todayStart)}
          >
            {intl.formatMessage({ id: 'mini-month-calendar.today', defaultMessage: 'Today' })}
          </button>
        )}
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <Typography.Text key={index} className={styles.weekday}>
            {label}
          </Typography.Text>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map(date => {
          const outsideMonth = !isSameMonth(date, visibleMonth);
          const selected = isSameDay(date, currentDate);
          const today = isToday(date);
          const dotLevel = getDotLevel(date);
          return (
            <button
              key={date.toISOString()}
              type="button"
              className={styles.dayCell}
              data-outside={outsideMonth || undefined}
              data-today={today || undefined}
              data-selected={selected || undefined}
              onClick={() => onDateChange(date)}
            >
              <span className={styles.dayNumber}>
                {format(date, 'd')}
                {dotLevel && <span className={styles.statusDot} data-level={dotLevel} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniMonthCalendar;
