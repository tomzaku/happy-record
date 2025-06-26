import React from 'react';
import { Motion, spring } from 'react-motion';

import ChecklistCalendar from './components/checklist-calendar';
import ChecklistToday from './components/checklist-today';
import CreateChecklist from './components/create-checklist';
import WeeklyCalendar from './components/weekly-calendar';
import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.module.scss';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';
import cx from 'classnames';

const TaskListPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());
  const [key, setKey] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);

  // Update key and trigger flip when date changes
  React.useEffect(() => {
    setFlipping(true);
    const timeout = setTimeout(() => {
      setKey(prev => prev + 1);
      setFlipping(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [startDate]);

  return (
    <div className={styles.container}>
      <AppHeader />
      <div className={styles.body}>
        <Card className={styles.card}>
          <WeeklyCalendar currentDate={startDate} onDateChange={setStartDate} />
          <Hr classes={{ hr: styles.hr, container: styles.hrContainer }} />
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
                      <ChecklistToday date={startDate} />
                    </div>
                    {/* <CreateChecklist /> */}
                  </Card>
                </div>
              );
            }}
          </Motion>
        </div>
      </div>
      <MusicAudioPlayer className={styles.player} />
    </div>
  );
};

export default TaskListPage;
