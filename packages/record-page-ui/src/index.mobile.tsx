import React from 'react';
import { Motion, spring } from 'react-motion';

import ChecklistDay from './components/checklist-day';
import WeeklyCalendar from './components/weekly-calendar';
import WeeklyProgressCard from './components/WeeklyProgressCard';
import AddTaskFab from './components/AddTaskFab';
// import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.mobile.module.scss';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import cx from 'classnames';
import { useSelectedDate } from './hooks/useSelectedDate';

// The List/Calendar/History switcher is gone for now — mobile always shows List (the day's task
// list under the week strip); Calendar and History skip for now rather than being reachable with
// no way to get to them. Revisit once mobile has a real place for those two again.
const TaskListPage = () => {
  const [startDate, setStartDate] = useSelectedDate();
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);
  // Filter-by-tag was hidden on the home page (most people never use it) —
  // this stays fixed at 'all' rather than threading a picker through, same
  // "no filter" behavior every view already had by default.
  const selectedTag = 'all';

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
    <div className={cx(styles.container, styles.almanacScope)}>
      <AppHeader />

      <div className={styles.body}>
        <Card className={styles.card}>
          <WeeklyCalendar
            currentDate={startDate}
            onDateChange={setStartDate}
            selectedTag={selectedTag}
          />
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
                  <div className={styles.flipper}>
                    <div className={styles.front} key={key}>
                      <ChecklistDay
                        date={startDate}
                        selectedTag={selectedTag === 'all' ? undefined : selectedTag}
                        onGoToToday={() => setStartDate(new Date())}
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          </Motion>
        </div>

        <WeeklyProgressCard />
      </div>
      <AddTaskFab date={startDate} />
      {/* <MusicAudioPlayer className={styles.player} /> */}
    </div>
  );
};

export default TaskListPage;
