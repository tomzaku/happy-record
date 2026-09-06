import React from 'react';
import Chart from 'react-apexcharts';
import { useIntl } from '@dreamer/translation';
import { Theme, usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import { buildBreakdownOptions, buildDailyChartOptions } from '../../lib/chartOptions';
import { MAX_METRIC_TABS } from '../../lib/chartColors';
import { buildBreakdown, buildDailyActivity, buildDays, buildMetricTabs, formatShortDate, RANGE_DAYS } from '../../lib/dashboardMath';
import { Dashboard } from '../../types';
import styles from '../../index.module.scss';

const StreaksCard = ({
  dashboard,
  userId,
  myStreak,
  bestStreak,
  totalCheckIns,
}: {
  dashboard: Dashboard;
  userId: string | undefined;
  myStreak: number;
  bestStreak: number;
  totalCheckIns: number;
}) => {
  const intl = useIntl();
  const { theme } = usePomodoroGlobalConfig();
  const isDark = theme === Theme.Dark;
  // Which series the "Breakdown by participant" chart is showing —
  // 'checkins' or a target's own fieldId. Tabs instead of a grouped bar so
  // each metric reads at full width instead of getting squeezed 4-wide.
  const [metricTab, setMetricTab] = React.useState('checkins');

  const days = React.useMemo(() => buildDays(RANGE_DAYS), []);

  // The "Words per day"-style trend line: how active the group is over
  // time, as opposed to the breakdown chart below (who's ahead right now).
  const dailyActivity = React.useMemo(() => buildDailyActivity(dashboard.completions, days), [dashboard, days]);
  const dailyChartOptions = React.useMemo(() => buildDailyChartOptions(isDark, days), [isDark, days]);

  // One tab per metric — Check-ins plus (up to MAX_METRIC_TABS - 1) of the
  // owner's own targets, each already broken down per user by
  // getChallengeDashboard's `targets[].contributions`.
  const metricTabs = React.useMemo(() => buildMetricTabs(dashboard, intl, MAX_METRIC_TABS), [dashboard, intl]);
  const activeTabIndex = Math.max(0, metricTabs.findIndex(t => t.key === metricTab));
  const activeTab = metricTabs[activeTabIndex];

  const breakdown = React.useMemo(() => buildBreakdown(dashboard, activeTab, userId), [dashboard, activeTab, userId]);
  const breakdownOptions = React.useMemo(
    () => buildBreakdownOptions(isDark, activeTabIndex, activeTab, breakdown?.categories ?? []),
    [isDark, activeTabIndex, activeTab, breakdown],
  );

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
        <Chart options={dailyChartOptions} series={[{ name: 'Check-ins', data: dailyActivity.data }]} type="bar" height={160} />
        <div className={styles.chartAxisEnds}>
          <span>{formatShortDate(days[0])}</span>
          <span>{formatShortDate(days[days.length - 1])}</span>
        </div>

        {metricTabs.length > 0 && breakdown && (
          <>
            <hr className={styles.sectionDivider} />
            <div className={styles.sectionHeaderRow}>
              <Typography.Text className={styles.sectionHeaderTitle}>
                {intl.formatMessage({ id: 'ChallengeDashboard.breakdown', defaultMessage: 'Breakdown by participant' })}
              </Typography.Text>
              {metricTabs.length > 1 && (
                <div className={styles.tabRow}>
                  {metricTabs.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      className={styles.tabPill}
                      data-active={tab.key === activeTab?.key}
                      onClick={() => setMetricTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Chart
              options={breakdownOptions}
              series={[{ name: activeTab?.label, data: breakdown.data }]}
              type="bar"
              height={Math.max(160, breakdown.categories.length * 46)}
            />
          </>
        )}
      </div>
    </Card>
  );
};

export default StreaksCard;
