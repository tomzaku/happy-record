import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button/src/DefaultButton';
import { useIntl } from '@dreamer/translation';
import { isFieldGroupActiveOnDay, useSyncedSelector, FieldGroup } from '@dreamer/global';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { ViewMode } from '@dreamer/record-page-ui/src/components/view-switcher';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isToday,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import styles from './FieldGroupCalendar.module.scss';

type Props = {
  checklistTemplateId: string;
  fieldIds: string[];
  repeat: FieldGroup['repeat'];
  /** Controlled by HistorySection's own week/month/year switcher — see that
   * component's `renderCalendar`. */
  mode: ViewMode;
  onDaySelect?: (date: Date) => void;
};

// Same 0/1/3 scale as record-page-ui's YearView, just fed by record
// presence instead of Checklist.completedAt — a field group has no
// completedAt of its own (see ChecklistFieldGroupHistory's own doc
// comment), so "done" here means at least one record among this group's
// own fields landed that day.
const completionLevel = (scheduled: boolean, recorded: boolean): 0 | 1 | 3 =>
  !scheduled ? 0 : recorded ? 3 : 1;

// Presence-only week/month/year calendar scoped to one field group — the
// same three modes HistorySection gives the whole task, one level down (see
// ChecklistTemplateCalendar). Fetches its own range via getChecklistRecords
// since a field group's completion signal (a submission that day) is a
// different shape than a Checklist's own completedAt, so it can't just
// reuse WeekView/MonthView/YearView's own data as-is — but the mode itself
// (which grid to show) is controlled by HistorySection now, not owned here.
const FieldGroupCalendar = ({ checklistTemplateId, fieldIds, repeat, mode, onDaySelect }: Props) => {
  const intl = useIntl();
  const { getChecklistRecords } = useChecklistRecord();
  const [currentDate, setCurrentDate] = React.useState(() => new Date());

  const weekStart = React.useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = React.useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const monthStart = React.useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = React.useMemo(() => endOfMonth(currentDate), [currentDate]);
  const monthGridStart = React.useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const monthGridEnd = React.useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const yearStart = React.useMemo(() => startOfYear(currentDate), [currentDate]);
  const yearEnd = React.useMemo(() => endOfYear(currentDate), [currentDate]);

  const range =
    mode === 'week'
      ? { from: weekStart, to: weekEnd }
      : mode === 'month'
        ? { from: monthGridStart, to: monthGridEnd }
        : { from: yearStart, to: yearEnd };

  const groups = useSyncedSelector(getChecklistRecords, checklistTemplateId, {
    rangeDate: { from: range.from.toISOString(), to: range.to.toISOString() },
    type: 'date' as const,
    fieldIds,
  });

  const hasRecords = (date: Date) => (groups[format(date, 'yyyy-MM-dd')]?.length ?? 0) > 0;
  const isScheduled = (date: Date) => isFieldGroupActiveOnDay(repeat, date);

  return (
    <div className={styles.container}>
      {mode === 'week' && (
        <div>
          <div className={styles.navRow}>
            <div className={styles.navigation}>
              <Icon
                onClick={() => setCurrentDate(prev => subWeeks(prev, 1))}
                width={18}
                icon="basil:skip-prev-outline"
                className={styles.navIcon}
              />
              <Typography.Text className={styles.rangeLabel}>
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </Typography.Text>
              <Icon
                onClick={() => setCurrentDate(prev => addWeeks(prev, 1))}
                width={18}
                icon="basil:skip-next-outline"
                className={styles.navIcon}
              />
            </div>
            <Button onClick={() => setCurrentDate(new Date())} className={styles.todayButton}>
              {intl.formatMessage({ id: 'month-view.today', defaultMessage: 'Today' })}
            </Button>
          </div>
          <div className={styles.weekGrid}>
            {eachDayOfInterval({ start: weekStart, end: weekEnd }).map(date => {
              const scheduled = isScheduled(date);
              const recorded = hasRecords(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`${styles.weekCell} ${!scheduled ? styles.notScheduled : ''} ${isToday(date) ? styles.today : ''}`}
                  onClick={() => onDaySelect?.(date)}
                >
                  <Typography.Text className={styles.weekDayName}>{format(date, 'EEE')}</Typography.Text>
                  <Typography.Text className={styles.weekDayNumber}>{format(date, 'd')}</Typography.Text>
                  {recorded ? (
                    <Icon icon="solar:check-circle-bold" width={16} className={styles.recordedIcon} />
                  ) : (
                    <div className={styles.emptyDot} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'month' && (
        <div>
          <div className={styles.navRow}>
            <div className={styles.navigation}>
              <Icon
                onClick={() => setCurrentDate(prev => subMonths(prev, 1))}
                width={18}
                icon="basil:skip-prev-outline"
                className={styles.navIcon}
              />
              <Typography.Text className={styles.rangeLabel}>{format(currentDate, 'MMMM yyyy')}</Typography.Text>
              <Icon
                onClick={() => setCurrentDate(prev => addMonths(prev, 1))}
                width={18}
                icon="basil:skip-next-outline"
                className={styles.navIcon}
              />
            </div>
            <Button onClick={() => setCurrentDate(new Date())} className={styles.todayButton}>
              {intl.formatMessage({ id: 'month-view.today', defaultMessage: 'Today' })}
            </Button>
          </div>
          <div className={styles.monthGrid}>
            {eachDayOfInterval({ start: monthGridStart, end: monthGridEnd }).map(date => {
              const inMonth = isSameMonth(date, currentDate);
              const scheduled = isScheduled(date);
              const recorded = hasRecords(date);
              return (
                <div
                  key={date.toISOString()}
                  className={`${styles.monthCell} ${!inMonth ? styles.outsideMonth : ''} ${
                    inMonth && !scheduled ? styles.notScheduled : ''
                  } ${isToday(date) ? styles.today : ''}`}
                  onClick={() => inMonth && onDaySelect?.(date)}
                >
                  <Typography.Text className={styles.monthDayNumber}>{format(date, 'd')}</Typography.Text>
                  {inMonth && recorded && (
                    <Icon icon="solar:check-circle-bold" width={12} className={styles.recordedIcon} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'year' && (
        <div>
          <div className={styles.navRow}>
            <div className={styles.navigation}>
              <Icon
                onClick={() => setCurrentDate(prev => new Date(prev.getFullYear() - 1, 0, 1))}
                width={18}
                icon="basil:skip-prev-outline"
                className={styles.navIcon}
              />
              <Typography.Text className={styles.rangeLabel}>{format(currentDate, 'yyyy')}</Typography.Text>
              <Icon
                onClick={() => setCurrentDate(prev => new Date(prev.getFullYear() + 1, 0, 1))}
                width={18}
                icon="basil:skip-next-outline"
                className={styles.navIcon}
              />
            </div>
            <Button onClick={() => setCurrentDate(new Date())} className={styles.todayButton}>
              {intl.formatMessage({ id: 'month-view.today', defaultMessage: 'Today' })}
            </Button>
          </div>
          <div className={styles.monthsGrid}>
            {eachMonthOfInterval({ start: yearStart, end: yearEnd }).map(month => {
              const mStart = startOfMonth(month);
              const mEnd = endOfMonth(month);
              const gStart = startOfWeek(mStart, { weekStartsOn: 1 });
              const gEnd = endOfWeek(mEnd, { weekStartsOn: 1 });
              return (
                <div key={month.toISOString()} className={styles.miniMonth}>
                  <Typography.Text className={styles.miniMonthLabel}>{format(month, 'MMM')}</Typography.Text>
                  <div className={styles.miniGrid}>
                    {eachDayOfInterval({ start: gStart, end: gEnd }).map(date => {
                      const inMonth = isSameMonth(date, month);
                      const level = inMonth ? completionLevel(isScheduled(date), hasRecords(date)) : undefined;
                      return (
                        <div
                          key={date.toISOString()}
                          className={`${styles.dayCell} ${inMonth ? styles[`level${level}`] : styles.outsideMonth} ${
                            isToday(date) ? styles.today : ''
                          }`}
                          title={inMonth ? format(date, 'MMM d, yyyy') : undefined}
                          onClick={() => inMonth && onDaySelect?.(date)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldGroupCalendar;
