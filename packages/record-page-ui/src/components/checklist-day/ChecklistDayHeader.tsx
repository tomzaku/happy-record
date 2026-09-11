import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import { useIntl } from '@dreamer/translation';
import { format, isToday } from 'date-fns';
import styles from './ChecklistDay.desktop.module.scss';
import { LunarDate } from '../../utils/lunarDate';

type Props = {
  date: Date;
  lunar: LunarDate;
  completedCount: number;
  pendingCount: number;
  completedPercent: number;
  // Only passed by the desktop home page (index.desktop.tsx), which owns the currently-viewed
  // date — undefined anywhere else this header might render standalone, so the button below has
  // nothing to fall back to and just doesn't show.
  onGoToToday?: () => void;
};

// The date/progress banner shown above every branch of ChecklistDay.desktop.tsx (loading,
// empty, and the full list) — pulled into its own file to keep that component under the repo's
// ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200 lines").
const ChecklistDayHeader = ({ date, lunar, completedCount, pendingCount, completedPercent, onGoToToday }: Props) => {
  const intl = useIntl();
  const showTodayButton = onGoToToday && !isToday(date);
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <Typography.Title level={2} className={styles.dateTitle} noMargin>
          {isToday(date)
            ? intl.formatMessage({ id: 'ChecklistToday.today', defaultMessage: 'Today' })
            : format(date, 'EEEE')}
        </Typography.Title>
        <Typography.Text className={styles.dateSubtitle}>
          {intl.formatMessage(
            {
              id: 'ChecklistToday.date-subtitle',
              defaultMessage: '{{solarDate}} · Lunar day {{day}}, mo {{month}}',
            },
            { solarDate: format(date, 'MMMM d'), day: lunar.day, month: lunar.month },
          )}
        </Typography.Text>
      </div>
      <div className={styles.headerRight}>
        {showTodayButton && (
          <Button type="outline" size="sm" className={styles.todayButton} onClick={onGoToToday}>
            {intl.formatMessage({ id: 'ChecklistToday.go-to-today', defaultMessage: 'Back to Today' })}
          </Button>
        )}
        <div className={styles.progressBlock}>
          <Typography.Text className={styles.progressLabel}>
            {intl.formatMessage(
              { id: 'ChecklistToday.done-count', defaultMessage: '{{count}} done' },
              { count: completedCount },
            )}
          </Typography.Text>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${completedPercent}%` }} />
          </div>
          <Typography.Text className={styles.progressLabel}>
            {intl.formatMessage(
              { id: 'ChecklistToday.to-go-count', defaultMessage: '{{count}} to go' },
              { count: pendingCount },
            )}
          </Typography.Text>
        </div>
      </div>
    </div>
  );
};

export default ChecklistDayHeader;
