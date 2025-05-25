import React from 'react';

import ChecklistCalendar from './components/checklist-calendar';
import ChecklistToday from './components/checklist-today';
import CreateChecklist from './components/create-checklist';
import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.module.scss';
import AppHeader from '@dreamer/header';

const PregnantPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());

  return (
    <div className={styles.container}>
      <AppHeader />
      <ChecklistCalendar date={startDate} onDateChange={setStartDate} />
      <ChecklistToday date={startDate} />
      <MusicAudioPlayer className={styles.player} />
      <CreateChecklist />
    </div>
  );
};

export default PregnantPage;
