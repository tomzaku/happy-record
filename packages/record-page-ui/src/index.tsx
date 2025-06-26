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
    }, 200); // match flip animation duration
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
        <Card className={styles.cardFooter}>
          <div className={styles.flipContainer}>
            <div
              className={
                styles.flipper + (flipping ? ' ' + styles.flipped : '')
              }
            >
              <div className={styles.front} key={key}>
                <ChecklistToday date={startDate} />
              </div>
              <CreateChecklist />
            </div>
          </div>
        </Card>
      </div>
      <MusicAudioPlayer className={styles.player} />
    </div>
  );
};

export default TaskListPage;
