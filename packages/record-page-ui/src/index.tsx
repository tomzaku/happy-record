import React from 'react';

import ChecklistCalendar from './components/checklist-calendar';
import ChecklistToday from './components/checklist-today';
import CreateChecklist from './components/create-checklist';
import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.module.scss';
import AppHeader from '@dreamer/header';
import Card from '@moon-ui/card';
import Hr from '@pregnant/create-checklist-page-ui/src/hr';

const PregnantPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());

  return (
    <div className={styles.container}>
      <AppHeader />
      <div className={styles.body}>
        <Card className={styles.card}>
          <ChecklistCalendar date={startDate} onDateChange={setStartDate} />
          <Hr classes={{ hr: styles.hr }} />
          <ChecklistToday date={startDate} />
          <CreateChecklist />
        </Card>
      </div>
      <MusicAudioPlayer className={styles.player} />
    </div>
  );
};

export default PregnantPage;
