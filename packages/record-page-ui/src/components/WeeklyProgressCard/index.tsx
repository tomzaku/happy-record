import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday } from 'date-fns';
import { useWeeklyCompletionStats } from '@dreamer/global';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';
import cx from 'classnames';
import styles from './index.module.scss';

/**
 * Home page's "how am I doing this week" glance — this week's % of scheduled
 * tasks completed, plus a 7-day bar underneath so a bad day is visible at a
 * glance, not just buried in the average. Links to the full `/dashboard`
 * page (dashboard-page-ui) for other weeks and more detail; this card only
 * ever shows the current week — see useWeeklyCompletionStats for why "this
 * week" is Monday-start, matching every other weekly view in the app.
 */
const WeeklyProgressCard = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const stats = useWeeklyCompletionStats(React.useMemo(() => new Date(), []));

  return (
    <Card className={styles.card} onClick={() => navigate('/dashboard')}>
      <div className={styles.header}>
        <Typography.Text className={styles.title}>
          {intl.formatMessage({ id: 'WeeklyProgressCard.title', defaultMessage: 'This week' })}
        </Typography.Text>
        <span className={styles.link}>
          {intl.formatMessage({ id: 'WeeklyProgressCard.view-dashboard', defaultMessage: 'Dashboard' })}
          <Icon icon="solar:alt-arrow-right-linear" width={12} />
        </span>
      </div>

      <div className={styles.summaryRow}>
        <Typography.Title level={2} noMargin className={styles.percent}>
          {stats.percent}%
        </Typography.Title>
        <Typography.Text className={styles.summarySub}>
          {intl.formatMessage(
            { id: 'WeeklyProgressCard.summary', defaultMessage: '{{completed}} of {{total}} tasks done' },
            { completed: stats.completed, total: stats.total },
          )}
        </Typography.Text>
      </div>

      <div className={styles.bars}>
        {stats.days.map(day => {
          const dayPercent = day.total > 0 ? Math.round((day.completed / day.total) * 100) : 0;
          return (
            <div
              key={day.date.toDateString()}
              className={styles.barCol}
              title={`${format(day.date, 'EEE, MMM d')} · ${day.completed}/${day.total}`}
            >
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ height: `${dayPercent}%` }} />
              </div>
              <span className={cx(styles.barLabel, isToday(day.date) && styles.barLabelToday)}>
                {format(day.date, 'EEEEE')}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WeeklyProgressCard;
