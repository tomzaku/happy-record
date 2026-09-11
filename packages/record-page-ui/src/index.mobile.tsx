import React from 'react';
import { Motion, spring } from 'react-motion';

import ChecklistDay from './components/checklist-day';
import WeeklyCalendar from './components/weekly-calendar';
import RecentHistory from './components/RecentHistory';
import WeeklyProgressCard from './components/WeeklyProgressCard';
import switcherStyles from './components/view-switcher/index.module.scss';
import HomeCalendar from './components/home-calendar';
import ChallengeQuickSubmit from './components/challenge-quick-submit';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.mobile.module.scss';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useSelectedDate } from './hooks/useSelectedDate';

type MobileViewMode = 'list' | 'calendar' | 'history';

// Mobile has no separate right column (unlike index.desktop.tsx), so the
// desktop's two stacked switchers — List/Calendar up top, Calendar/History
// just above the card below it — collapsed into duplicate-looking pill rows
// here. One flat List/Calendar/History switcher replaces both: List and
// History share the same layout (the small card + the day's task list),
// only swapping what the card shows.
const MOBILE_VIEW_MODES: { mode: MobileViewMode; id: string; defaultMessage: string }[] = [
  { mode: 'list', id: 'home-view-switcher.list', defaultMessage: 'List' },
  { mode: 'calendar', id: 'home-view-switcher.calendar', defaultMessage: 'Calendar' },
  { mode: 'history', id: 'right-panel-switcher.history', defaultMessage: 'History' },
];

const TaskListPage = () => {
  const intl = useIntl();
  const [startDate, setStartDate] = useSelectedDate();
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  // Filter-by-tag was hidden on the home page (most people never use it) —
  // this stays fixed at 'all' rather than threading a picker through, same
  // "no filter" behavior every view already had by default.
  const selectedTag = 'all';
  const [viewMode, setViewMode] = React.useState<MobileViewMode>('list');

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
        <ChallengeQuickSubmit />
        <div className={styles.viewSwitcherContainer}>
          <div className={switcherStyles.container}>
            {MOBILE_VIEW_MODES.map(({ mode, id, defaultMessage }) => (
              <button
                key={mode}
                type="button"
                className={cx(switcherStyles.option, viewMode === mode && switcherStyles.active)}
                onClick={() => setViewMode(mode)}
              >
                <Typography.Text className={switcherStyles.label}>
                  {intl.formatMessage({ id, defaultMessage })}
                </Typography.Text>
              </button>
            ))}
          </div>
        </div>
        {(viewMode === 'list' || viewMode === 'history') && (
          <>
            <Card className={styles.card}>
              {viewMode === 'list' ? (
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
