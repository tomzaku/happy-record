import React from 'react';
import { useNavigate } from 'react-router-dom';

import ChecklistTodayDesktop from './components/checklist-today/ChecklistToday.desktop';
import WeeklyCalendarVertical from './components/weekly-calendar/WeeklyCalendarVertical';
import RecentHistory from './components/RecentHistory';
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
import { useIntl } from '@dreamer/translation';

type RightPanelMode = 'calendar' | 'history';

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
      <div className={styles.desktopBody}>
        {/* Right Calendar — rendered first (see the module's own
            `grid-column` placement) so its checklists range-fetch effect
            claims the visible days before ChecklistTodayDesktop's own
            single-day fetch runs; effects fire in JSX order for sibling
            components, and this fetch is the one that should win the race
            for "today" — see useChecklists.tsx's `ensureChecklistsFetched`. */}
        {viewMode === 'day' && (
          <div className={styles.rightCalendar}>
            <div className={cx(switcherStyles.container, styles.rightPanelSwitcher)}>
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
                  {intl.formatMessage({ id: 'right-panel-switcher.history', defaultMessage: 'History' })}
                </Typography.Text>
              </button>
            </div>
            <Card className={styles.calendarCard}>
              {rightPanelMode === 'calendar' ? (
                <WeeklyCalendarVertical
                  currentDate={startDate}
                  onDateChange={setStartDate}
                  selectedTag={selectedTag}
                />
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
