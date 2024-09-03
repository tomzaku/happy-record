// import Calendar from './components/calendar';
import React from 'react';
import BodyMetricCard from './body-metric-card';

import BabyCard from './components/baby-card';
import ChecklistCalendar from './components/checklist-calendar';
import ChecklistToday from './components/checklist-today';
import CreateChecklist from './components/create-checklist';

const PregnantPage = () => {
  const [startDate, setStartDate] = React.useState(new Date());
  return (
    <div>
      <BabyCard />
      <BodyMetricCard />
      <ChecklistCalendar date={startDate} onDateChange={setStartDate} />
      <ChecklistToday date={startDate} />
      <CreateChecklist />
    </div>
  );
};

export default PregnantPage;
