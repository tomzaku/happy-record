import React from 'react';

import ChecklistDayDesktop from './components/checklist-day/ChecklistDay.desktop';
import MiniMonthCalendar from './components/mini-month-calendar';
import RecentHistory from './components/RecentHistory';
import WeeklyProgressCard from './components/WeeklyProgressCard';
import HomeViewSwitcher, { HomeViewMode } from './components/home-view-switcher';
import switcherStyles from './components/view-switcher/index.module.scss';
import HomeCalendar from './components/home-calendar';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import { DesktopDrawer } from '@dreamer/header';
import styles from './index.desktop.module.scss';
import Card from '@moon-ui/card';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useSelectedDate } from './hooks/useSelectedDate';

type RightPanelMode = 'calendar' | 'history';

const TaskListPage = () => {
  const intl = useIntl();
  const [startDate, setStartDate] = useSelectedDate();
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  // Filter-by-tag was hidden on the home page (most people never use it) —
  // this stays fixed at 'all' rather than threading a picker through, same
  // "no filter" behavior every view already had by default.
  const selectedTag = 'all';
  const [viewMode, setViewMode] = React.useState<HomeViewMode>('list');
  // The right column's own Calendar/History toggle — defaults to Calendar,
  // matching what this column always showed before History existed.
  const [rightPanelMode, setRightPanelMode] = React.useState<RightPanelMode>('calendar');

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
    <div className={styles.desktopContainer} style={{ opacity: 1, flex: 1, display: 'flex' }}>
      <DesktopDrawer />
      <div className={cx(styles.desktopBody, styles.almanacScope)}>
        {/* Right Calendar — rendered first (see the module's own
            `grid-column` placement) so its checklists range-fetch effect
            claims the visible days before ChecklistDayDesktop's own
            single-day fetch runs; effects fire in JSX order for sibling
            components, and this fetch is the one that should win the race
            for "today" — see useChecklists.tsx's `ensureChecklistsFetched`. */}
        {viewMode === 'list' && (
          <div className={styles.rightCalendar}>
            <div className={styles.rightPanelHeader}>
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
                  <div className={styles.recentHistorySection}>
                    <Typography.Text className={styles.recentHistoryLabel}>
                      {intl.formatMessage({ id: 'recent-history.title', defaultMessage: 'Recent history' })}
                    </Typography.Text>
                    <RecentHistory />
                  </div>
                </div>
              ) : (
                <RecentHistory />
              )}
            </Card>

            <WeeklyProgressCard />
          </div>
        )}

        {/* Center Content - Always Shows Tasks */}
        <div className={cx(styles.centerContent, viewMode !== 'list' && styles.centerContentFull)}>
          <div className={styles.taskListContainer}>
            <div className={styles.taskHeader}>
              <HomeViewSwitcher value={viewMode} onChange={setViewMode} />
            </div>
            {viewMode === 'list' && (
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
                    <ChecklistDayDesktop
                      date={startDate}
                      selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                    />
                  </div>
                </div>
              </div>
            )}
            {viewMode === 'calendar' && (
              <Card className={styles.calendarViewCard}>
                <HomeCalendar currentDate={startDate} onDateChange={setStartDate} selectedTag={selectedTag} />
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* <MusicAudioPlayer className={styles.player} /> */}
    </div>
  );
};

export default TaskListPage;
