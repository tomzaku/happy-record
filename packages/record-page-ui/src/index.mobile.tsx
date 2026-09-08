import React from 'react';
import { Motion, spring } from 'react-motion';

import ChecklistDay from './components/checklist-day';
import WeeklyCalendar from './components/weekly-calendar';
import RecentHistory from './components/RecentHistory';
import WeeklyProgressCard from './components/WeeklyProgressCard';
import HomeViewSwitcher, { HomeViewMode } from './components/home-view-switcher';
import switcherStyles from './components/view-switcher/index.module.scss';
import HomeCalendar from './components/home-calendar';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.mobile.module.scss';
import AppHeader from '@dreamer/header';
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
  // Same Calendar/History toggle as index.desktop.tsx's right column — mobile
  // has no separate right column, so it sits directly above the same Card
  // the calendar strip already used, swapping only that card's content.
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
    <div className={styles.container}>
      <AppHeader />

      <div className={styles.body}>
        <div className={styles.viewSwitcherContainer}>
          <HomeViewSwitcher value={viewMode} onChange={setViewMode} />
        </div>
        {viewMode === 'list' && (
          <>
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
            <Card className={styles.card}>
              {rightPanelMode === 'calendar' ? (
                <WeeklyCalendar
                  currentDate={startDate}
                  onDateChange={setStartDate}
                  selectedTag={selectedTag}
                />
              ) : (
                <RecentHistory />
              )}
            </Card>

            <div className={styles.taskListContainer}>
              <Motion
                style={{
                  rotateX: spring(flipping ? -180 : 0, {
                    stiffness: 200,
                    damping: 25,
                  }),
                  opacity: spring(flipping ? 0.3 : 1, {
                    stiffness: 200,
                    damping: 25,
                  }),
                }}
              >
                {({ rotateX, opacity }) => {
                  // Hide component when it's flipped at the top (around 180 degrees)
                  const isFlippedAtTop = flipping && rotateX > 150 && rotateX < 210;
                  const displayOpacity = isFlippedAtTop ? 0 : opacity;

                  return (
                    <div
                      style={{
                        transform: `perspective(1000px) rotateX(${rotateX}deg)`,
                        opacity: displayOpacity,
                        transformOrigin: 'top',
                      }}
                    >
                      <Card className={cx(styles.cardFooter, styles.flipper)}>
                        <div className={styles.front} key={key}>
                          <ChecklistDay
                            date={startDate}
                            selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                          />
                        </div>
                        {/* <CreateChecklist /> */}
                      </Card>
                    </div>
                  );
                }}
              </Motion>
            </div>
          </>
        )}

        {viewMode === 'calendar' && (
          <Card className={styles.plainCard}>
            <HomeCalendar currentDate={startDate} onDateChange={setStartDate} selectedTag={selectedTag} />
          </Card>
        )}

        <WeeklyProgressCard />
      </div>
      {/* <MusicAudioPlayer className={styles.player} /> */}
    </div>
  );
};

export default TaskListPage;
