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

const PregnantPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());
  const [key, setKey] = React.useState(0);

  // Update key when date changes to trigger animation
  React.useEffect(() => {
    setKey(prev => prev + 1);
  }, [startDate]);

  return (
    <div className={styles.container}>
      <AppHeader />
      <div className={styles.body}>
        <WeeklyCalendar currentDate={startDate} onDateChange={setStartDate} />
        <Card className={styles.card}>
          <ChecklistCalendar date={startDate} onDateChange={setStartDate} />
          <Hr classes={{ hr: styles.hr }} />
          <Motion
            key={key}
            defaultStyle={{ opacity: 0, y: 20 }}
            style={{
              opacity: spring(1, { stiffness: 300, damping: 30 }),
              y: spring(0, { stiffness: 300, damping: 30 }),
            }}
          >
            {interpolatedStyle => (
              <div
                style={{
                  opacity: interpolatedStyle.opacity,
                  transform: `translateY(${interpolatedStyle.y}px)`,
                }}
              >
                <ChecklistToday date={startDate} />
              </div>
            )}
          </Motion>
          <CreateChecklist />
        </Card>
      </div>
      <MusicAudioPlayer className={styles.player} />
    </div>
  );
};

export default PregnantPage;
