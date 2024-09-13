// import Calendar from './components/calendar';
import React from 'react';
import BodyMetricCard from './components/body-metric-card';

import BabyCard from './components/baby-card';
import ChecklistCalendar from './components/checklist-calendar';
import ChecklistToday from './components/checklist-today';
import CreateChecklist from './components/create-checklist';
import LunarCalendar from './components/lunar-calendar';
import MusicAudioPlayer from '@pregnant/music-audio-player';
import styles from './index.module.scss';

const PregnantPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());

  // get lunar day of the month

  return (
    <div className={styles.container}>
      <BabyCard />
      <div className={styles.row}>
        <BodyMetricCard />
        <LunarCalendar />
      </div>
      <ChecklistCalendar date={startDate} onDateChange={setStartDate} />
      <ChecklistToday date={startDate} />
      <MusicAudioPlayer className={styles.player} />
      <CreateChecklist />
    </div>
  );
};

export default PregnantPage;
