import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';

import ChecklistTodayDesktop from './components/checklist-today/ChecklistToday.desktop';
import MiniMonthCalendar from './components/mini-month-calendar';
import RecentHistory from './components/RecentHistory';
import WeeklyProgressCard from './components/WeeklyProgressCard';
import ViewSwitcher, { ViewMode } from './components/view-switcher';
import switcherStyles from './components/view-switcher/index.module.scss';
import WeekView from './components/week-view';
import MonthView from './components/month-view';
import YearView from './components/year-view';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import { DesktopDrawer } from '@dreamer/header';
import styles from './index.desktop.module.scss';
import Card from '@moon-ui/card';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import { useIntl } from '@dreamer/translation';

type RightPanelMode = 'calendar' | 'history';

// The right panel's "This Day" row — a quick-glance strip of the selected
// day's items (title + done state), capped so it never grows the panel
// taller than the calendar above it; the rest is a "+N more" count rather
// than a scrollable list (Day view, right below, is already that list).
const THIS_DAY_VISIBLE_LIMIT = 4;

const ThisDayChips = ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
  const { getChecklistByGivingDate } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();

  const { checklist, checklistIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  if (checklistIds.length === 0) return null;

  const visibleIds = checklistIds.slice(0, THIS_DAY_VISIBLE_LIMIT);
  const overflowCount = checklistIds.length - visibleIds.length;

  return (
    <div className={styles.thisDaySection}>
      <Typography.Text className={styles.thisDayLabel}>This day</Typography.Text>
      <div className={styles.thisDayChips}>
        {visibleIds.map(id => {
          const item = checklist[id];
          const template = checklistTemplate[item?.checklistTemplateId];
          const completed = Boolean(item?.completedAt);
          return (
            <span
              key={id}
              className={cx(styles.chip, completed && styles.chipDone)}
              style={{ borderColor: template?.avatar.color || 'var(--almanac-card-border)' }}
            >
              {completed && <Icon icon="solar:check-circle-bold" width={12} />}
              {item?.title || template?.title}
            </span>
          );
        })}
        {overflowCount > 0 && (
          <span className={styles.chipMore}>+{overflowCount} more</span>
        )}
      </div>
    </div>
  );
};

const TaskListPage = () => {
  const intl = useIntl();
  const [startDate, setStartDate] = React.useState(new Date());
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  // Filter-by-tag was hidden on the home page (most people never use it) —
  // this stays fixed at 'all' rather than threading a picker through, same
  // "no filter" behavior every view already had by default.
  const selectedTag = 'all';
  const [viewMode, setViewMode] = React.useState<ViewMode>('day');
  // The right column's own Calendar/History toggle — defaults to Calendar,
  // matching what this column always showed before History existed.
  const [rightPanelMode, setRightPanelMode] = React.useState<RightPanelMode>('calendar');

  const goToDay = (date: Date) => {
    setStartDate(date);
    setViewMode('day');
  };

  // Update key and trigger flip when date changes
  React.useEffect(() => {
    setFlipping(true);
    const timeout = setTimeout(() => {
      setKey(prev => prev + 1);
      setFlipping(false);
    }, 200);
    return () => clearTimeout(timeout);
  }, [startDate]);

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={cx(styles.desktopBody, styles.almanacScope)}>
        {/* Right Calendar — rendered first (see the module's own
            `grid-column` placement) so its checklists range-fetch effect
            claims the visible days before ChecklistTodayDesktop's own
            single-day fetch runs; effects fire in JSX order for sibling
            components, and this fetch is the one that should win the race
            for "today" — see useChecklists.tsx's `ensureChecklistsFetched`. */}
        {viewMode === 'day' && (
          <div className={styles.rightCalendar}>
            <WeeklyProgressCard />
            <div className={styles.rightPanelHeader}>
              <Typography.Text className={styles.rightPanelLabel}>
                {intl.formatMessage({ id: 'right-panel-switcher.title', defaultMessage: 'History' })}
              </Typography.Text>
              <div className={switcherStyles.container}>
                <button
                  type="button"
                  className={cx(switcherStyles.option, rightPanelMode === 'calendar' && switcherStyles.active)}
                  onClick={() => setRightPanelMode('calendar')}
                >
                  <Typography.Text className={switcherStyles.label}>
                    {intl.formatMessage({ id: 'right-panel-switcher.calendar', defaultMessage: 'Calendar' })}
                  </Typography.Text>
                </button>
                <button
                  type="button"
                  className={cx(switcherStyles.option, rightPanelMode === 'history' && switcherStyles.active)}
                  onClick={() => setRightPanelMode('history')}
                >
                  <Typography.Text className={switcherStyles.label}>
                    {intl.formatMessage({ id: 'right-panel-switcher.history', defaultMessage: 'Recent' })}
                  </Typography.Text>
                </button>
              </div>
            </div>
            <Card className={styles.calendarCard}>
              {rightPanelMode === 'calendar' ? (
                <div className={styles.calendarPanel}>
                  <MiniMonthCalendar
                    currentDate={startDate}
                    onDateChange={setStartDate}
                    selectedTag={selectedTag}
                  />
                  <ThisDayChips date={startDate} selectedTag={selectedTag} />
                  <div className={styles.recentHistorySection}>
                    <Typography.Text className={styles.recentHistoryLabel}>
                      {intl.formatMessage({ id: 'recent-history.title', defaultMessage: 'Recent history' })}
                    </Typography.Text>
                    <RecentHistory limit={3} />
                  </div>
                </div>
              ) : (
                <RecentHistory />
              )}
            </Card>
          </div>
        )}

        {/* Center Content - Always Shows Tasks */}
        <div className={cx(styles.centerContent, viewMode !== 'day' && styles.centerContentFull)}>
          <div className={styles.taskListContainer}>
            <div className={styles.taskHeader}>
              <ViewSwitcher value={viewMode} onChange={setViewMode} />
            </div>
            {viewMode === 'day' && (
              <div
                style={{
                  transform: flipping ? 'perspective(1000px) rotateX(-180deg)' : 'perspective(1000px) rotateX(0deg)',
                  opacity: flipping ? 0.3 : 1,
                  transformOrigin: 'top',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className={cx(styles.flipper)}>
                  <div className={styles.front} key={key}>
                    <ChecklistTodayDesktop
                      date={startDate}
                      selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                    />
                  </div>
                </div>
              </div>
            )}
            {viewMode === 'week' && (
              <WeekView currentDate={startDate} onDateChange={setStartDate} selectedTag={selectedTag} />
            )}
            {viewMode === 'month' && (
              <MonthView currentDate={startDate} onDaySelect={goToDay} selectedTag={selectedTag} />
            )}
            {viewMode === 'year' && (
              <YearView currentDate={startDate} onDaySelect={goToDay} selectedTag={selectedTag} />
            )}
          </div>
        </div>
      </div>

      {/* <MusicAudioPlayer className={styles.player} /> */}
    </div>
  );
};

export default TaskListPage;
