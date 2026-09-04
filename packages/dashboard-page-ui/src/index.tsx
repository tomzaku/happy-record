import React from 'react';
import cx from 'classnames';
import { addWeeks, format, isSameDay, isToday, subWeeks } from 'date-fns';
import { useIntl } from '@dreamer/translation';
import {
  DailyCompletionStat,
  WeekCompletionSummary,
  useCompletionTrend,
  useWeeklyCompletionStats,
} from '@dreamer/global';
import { AppShell } from '@dreamer/header';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.module.scss';

const TREND_WEEKS = 8;

// One week's own bar chart — the daily breakdown behind this week's %.
// Hover reveals a per-bar tooltip (day, date, done/total) per the app's
// dataviz convention for a bar mark; the day column itself is the hit
// target, not just the thin bar, so it's easy to land on.
const DayBarChart = ({ days }: { days: DailyCompletionStat[] }) => {
  const intl = useIntl();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  return (
    <div className={styles.dayChart}>
      {days.map((day, index) => {
        const percent = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
        return (
          <div
            key={day.date.toDateString()}
            className={styles.dayCol}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(current => (current === index ? null : current))}
          >
            {hoveredIndex === index && (
              <div className={styles.tooltip}>
                <Typography.Text className={styles.tooltipTitle}>
                  {format(day.date, 'EEE, MMM d')}
                </Typography.Text>
                <Typography.Text className={styles.tooltipBody}>
                  {intl.formatMessage(
                    { id: 'Dashboard.tooltip-done', defaultMessage: '{{completed}}/{{total}} done · {{percent}}%' },
                    { completed: day.completed, total: day.total, percent },
                  )}
                </Typography.Text>
              </div>
            )}
            <div className={styles.dayTrack}>
              <div
                className={cx(styles.dayFill, day.total === 0 && styles.dayFillEmpty)}
                style={{ height: day.total > 0 ? `${percent}%` : '100%' }}
              />
            </div>
            <Typography.Text className={cx(styles.dayLabel, isToday(day.date) && styles.dayLabelToday)}>
              {format(day.date, 'EEE')}
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
};

// The last several weeks' completion rate, one bar each — lets a single
// week's number read as part of a trend instead of in isolation. Clicking a
// bar jumps the daily breakdown above to that week.
const WeekTrendChart = ({
  weeks,
  selectedWeekStart,
  onSelectWeek,
}: {
  weeks: WeekCompletionSummary[];
  selectedWeekStart: Date;
  onSelectWeek: (weekStart: Date) => void;
}) => {
  const intl = useIntl();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  return (
    <div className={styles.trendChart}>
      {weeks.map((week, index) => (
        <button
          type="button"
          key={week.weekStart.toDateString()}
          className={cx(
            styles.trendCol,
            isSameDay(week.weekStart, selectedWeekStart) && styles.trendColSelected,
          )}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(current => (current === index ? null : current))}
          onClick={() => onSelectWeek(week.weekStart)}
        >
          {hoveredIndex === index && (
            <div className={styles.tooltip}>
              <Typography.Text className={styles.tooltipTitle}>
                {format(week.weekStart, 'MMM d')} – {format(week.weekEnd, 'MMM d')}
              </Typography.Text>
              <Typography.Text className={styles.tooltipBody}>
                {intl.formatMessage(
                  { id: 'Dashboard.tooltip-done', defaultMessage: '{{completed}}/{{total}} done · {{percent}}%' },
                  { completed: week.completed, total: week.total, percent: week.percent },
                )}
              </Typography.Text>
            </div>
          )}
          <div className={styles.trendTrack}>
            <div
              className={cx(styles.trendFill, week.total === 0 && styles.trendFillEmpty)}
              style={{ height: week.total > 0 ? `${week.percent}%` : '100%' }}
            />
          </div>
          <Typography.Text className={styles.trendLabel}>{format(week.weekStart, 'MMM d')}</Typography.Text>
        </button>
      ))}
    </div>
  );
};

/**
 * Full weekly-completion dashboard — the deeper counterpart to the home
 * page's WeeklyProgressCard mini widget (record-page-ui), which only ever
 * shows the current week. Here a week is navigable (prev/next, or by
 * clicking a bar in the trend chart below), and a trend across the last
 * `TREND_WEEKS` weeks sits alongside the selected week's own daily
 * breakdown. Both sections derive from the same @dreamer/global hooks the
 * mini widget uses (useWeeklyCompletionStats / useCompletionTrend), so
 * "percentage of tasks finished" is computed in exactly one place.
 */
const DashboardPageUi = () => {
  const intl = useIntl();
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());

  const week = useWeeklyCompletionStats(selectedDate);
  // Trend is always anchored to today, not the navigated week, so paging
  // through past weeks above doesn't also shift this chart's own window.
  const trend = useCompletionTrend(React.useMemo(() => new Date(), []), TREND_WEEKS);

  const isCurrentWeek = isSameDay(week.weekStart, trend[trend.length - 1]?.weekStart ?? week.weekStart);

  return (
    <AppShell>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <Typography.Title level={3} noMargin className={styles.pageTitle}>
            {intl.formatMessage({ id: 'Dashboard.title', defaultMessage: 'Dashboard' })}
          </Typography.Title>
          <Typography.Text className={styles.pageSubtitle}>
            {intl.formatMessage({
              id: 'Dashboard.subtitle',
              defaultMessage: 'How much of your scheduled tasks you actually finish, week by week.',
            })}
          </Typography.Text>
        </div>

        <Card className={styles.weekCard}>
          <div className={styles.weekNav}>
            <button
              type="button"
              className={styles.navButton}
              aria-label={intl.formatMessage({ id: 'Dashboard.prev-week', defaultMessage: 'Previous week' })}
              onClick={() => setSelectedDate(current => subWeeks(current, 1))}
            >
              <Icon icon="solar:alt-arrow-left-linear" width={18} />
            </button>
            <div className={styles.weekRangeCol}>
              <Typography.Text className={styles.weekRange}>
                {format(week.weekStart, 'MMM d')} – {format(week.weekEnd, 'MMM d, yyyy')}
              </Typography.Text>
              {!isCurrentWeek && (
                <button type="button" className={styles.todayLink} onClick={() => setSelectedDate(new Date())}>
                  {intl.formatMessage({ id: 'Dashboard.jump-to-current', defaultMessage: 'Jump to this week' })}
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.navButton}
              aria-label={intl.formatMessage({ id: 'Dashboard.next-week', defaultMessage: 'Next week' })}
              onClick={() => setSelectedDate(current => addWeeks(current, 1))}
            >
              <Icon icon="solar:alt-arrow-right-linear" width={18} />
            </button>
          </div>

          <div className={styles.summaryRow}>
            <Typography.Title level={1} noMargin className={styles.percent}>
              {week.percent}%
            </Typography.Title>
            <Typography.Text className={styles.summarySub}>
              {intl.formatMessage(
                { id: 'Dashboard.summary', defaultMessage: '{{completed}} of {{total}} scheduled tasks completed' },
                { completed: week.completed, total: week.total },
              )}
            </Typography.Text>
          </div>

          {week.total === 0 ? (
            <Typography.Text className={styles.emptyState}>
              {intl.formatMessage({
                id: 'Dashboard.empty-week',
                defaultMessage: 'Nothing was scheduled this week.',
              })}
            </Typography.Text>
          ) : (
            <DayBarChart days={week.days} />
          )}
        </Card>

        <Card className={styles.trendCard}>
          <Typography.Text className={styles.sectionLabel}>
            {intl.formatMessage(
              { id: 'Dashboard.trend-title', defaultMessage: 'Last {{count}} weeks' },
              { count: TREND_WEEKS },
            )}
          </Typography.Text>
          <WeekTrendChart weeks={trend} selectedWeekStart={week.weekStart} onSelectWeek={setSelectedDate} />
        </Card>
      </div>
    </AppShell>
  );
};

export default DashboardPageUi;
