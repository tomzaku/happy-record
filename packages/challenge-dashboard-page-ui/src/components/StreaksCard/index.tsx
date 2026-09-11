import React from 'react';
import Chart from 'react-apexcharts';
import { useIntl } from '@dreamer/translation';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { buildDailyChartOptions } from '../../lib/chartOptions';
import { buildDailyActivity, buildDays, formatShortDate, RANGE_DAYS } from '../../lib/dashboardMath';
import { useSettledChartKey } from '../../hooks/useSettledChartKey';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

const StreaksCard = ({
  dashboard,
  myStreak,
  bestStreak,
  totalCheckIns,
}: {
  dashboard: Dashboard;
  myStreak: number;
  bestStreak: number;
  totalCheckIns: number;
}) => {
  const intl = useIntl();
  const { theme } = usePomodoroGlobalConfig();
  const isDark = theme === Theme.Dark;

  const days = React.useMemo(() => buildDays(RANGE_DAYS), []);

  // The "Words per day"-style trend line: how active the group is over
  // time, as opposed to TargetsCard's own per-participant breakdown chart
  // (who's ahead right now).
  const dailyActivity = React.useMemo(() => buildDailyActivity(dashboard.completions, days), [dashboard, days]);
  const checkinsChartType = dashboard.challenge?.checkinsChartType ?? 'bar';
  const dailyChartOptions = React.useMemo(
    () => buildDailyChartOptions(isDark, days, checkinsChartType),
    [isDark, days, checkinsChartType],
  );
  const settledDailyChartType = useSettledChartKey(checkinsChartType);

  if (!dashboard.participants.length) return null;

  return (
    <Card className={`${styles.card} ${styles.cardNoPadding}`}>
      <div className={styles.cardHeaderWash} style={{ background: 'rgba(235, 104, 52, 0.08)' }}>
        <div className={styles.cardHeaderTitle}>
          <Icon icon="solar:fire-bold-duotone" width={22} color="#eb6834" />
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({ id: 'ChallengeDashboard.streaks', defaultMessage: 'Streaks' })}
          </Typography.Title>
        </div>
        <Typography.Text className={styles.sectionHeaderSubtitle}>
          {intl.formatMessage({
            id: 'ChallengeDashboard.streaks-caption',
            defaultMessage: 'Your consistency, plus how the whole group is showing up.',
          })}
        </Typography.Text>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.statBlockRow}>
          <div className={styles.statBlock}>
            <Icon icon="solar:fire-bold-duotone" width={26} color="#eb6834" />
            <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#eb6834' }}>
              {myStreak}
            </Typography.Title>
            <Typography.Text className={styles.statBlockLabel}>
              {intl.formatMessage({ id: 'ChallengeDashboard.stat-your-streak', defaultMessage: 'your streak' })}
            </Typography.Text>
          </div>
          <div className={styles.statBlock}>
            <Icon icon="solar:cup-star-bold-duotone" width={26} color="#eda100" />
            <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#eda100' }}>
              {bestStreak}
            </Typography.Title>
            <Typography.Text className={styles.statBlockLabel}>
              {intl.formatMessage({ id: 'ChallengeDashboard.stat-best-streak', defaultMessage: 'best streak' })}
            </Typography.Text>
          </div>
          <div className={styles.statBlock}>
            <Icon icon="solar:check-circle-bold-duotone" width={26} color="#1baf7a" />
            <Typography.Title level={3} noMargin className={styles.statBlockValue} style={{ color: '#1baf7a' }}>
              {totalCheckIns}
            </Typography.Title>
            <Typography.Text className={styles.statBlockLabel}>
              {intl.formatMessage({ id: 'ChallengeDashboard.stat-checkins', defaultMessage: 'check-ins (30d)' })}
            </Typography.Text>
          </div>
        </div>

        <hr className={styles.sectionDivider} />

        <div className={styles.sectionHeaderRow}>
          <div>
            <Typography.Text className={styles.sectionHeaderTitle}>
              {intl.formatMessage({ id: 'ChallengeDashboard.daily-activity', defaultMessage: 'Check-ins per day' })}
            </Typography.Text>
            <Typography.Text className={styles.sectionHeaderSubtitle}>
              {intl.formatMessage(
                { id: 'ChallengeDashboard.daily-activity-caption', defaultMessage: '{{average}} on average · best {{best}}' },
                { average: dailyActivity.average, best: dailyActivity.best },
              )}
            </Typography.Text>
          </div>
        </div>
        {/* Remounts on a real type change instead of an in-place options update — see
            useSettledChartKey's own comment for why a bare `key` isn't enough by itself. Blank
            for one tick during that gap rather than nothing at all, so the layout doesn't jump. */}
        {settledDailyChartType ? (
          <Chart
            key={settledDailyChartType}
            options={dailyChartOptions}
            series={[{ name: 'Check-ins', data: dailyActivity.data }]}
            type={settledDailyChartType}
            height={160}
          />
        ) : (
          <div style={{ height: 160 }} />
        )}
        <div className={styles.chartAxisEnds}>
          <span>{formatShortDate(days[0])}</span>
          <span>{formatShortDate(days[days.length - 1])}</span>
        </div>
      </div>
    </Card>
  );
};

export default StreaksCard;
