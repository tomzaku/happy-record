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
  isBefore,
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
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// A compact, always-inline month grid for the home page's calendar panel —
// distinct from CalendarDialogDesktop (a full modal "jump to a date"
// picker reused elsewhere) since this one also needs to show which days
// have anything recorded (the small dot), which that dialog never needed.
const MiniMonthCalendar = ({ currentDate, onDateChange, selectedTag }: Props) => {
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

  // A plain traffic light — but "nothing done yet" only reads as `missed`
  // (red) once the day has actually happened; a future day with nothing
  // done yet hasn't failed anything, it just hasn't arrived, so that's
  // `upcoming` (neutral) instead. Today itself counts as `upcoming` too —
  // there's still time left in it. `undefined` (nothing scheduled at all)
  // renders no badge.
  const getDotLevel = React.useCallback(
    (date: Date): 'upcoming' | 'missed' | 'inProgress' | 'done' | undefined => {
      const { checklist } = getChecklistForDateWithoutFetching({
        date,
        selectedTag: selectedTag === 'all' ? undefined : selectedTag,
      });
      const items = Object.values(checklist);
      if (items.length === 0) return undefined;
      const completed = items.filter(item => item.completedAt).length;
      if (completed === items.length) return 'done';
      if (completed > 0) return 'inProgress';
      return isBefore(startOfDay(date), todayStart) ? 'missed' : 'upcoming';
    },
    [getChecklistForDateWithoutFetching, selectedTag, todayStart],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
          <Icon
            onClick={() => setVisibleMonth(prev => subMonths(prev, 1))}
            width={16}
            icon="basil:skip-prev-outline"
            className={styles.navIcon}
          />
        <Typography.Text className={styles.monthLabel}>
          {format(visibleMonth, 'MMMM yyyy')}
        </Typography.Text>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.todayButton}
            onClick={() => onDateChange(todayStart)}
          >
            {intl.formatMessage({ id: 'mini-month-calendar.today', defaultMessage: 'Today' })}
          </button>
        <Icon
          onClick={() => setVisibleMonth(prev => addMonths(prev, 1))}
          width={16}
          icon="basil:skip-next-outline"
          className={styles.navIconRight}
        />
        </div>
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
              <span className={styles.dayNumber} data-level={dotLevel}>
                {format(date, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MiniMonthCalendar;
