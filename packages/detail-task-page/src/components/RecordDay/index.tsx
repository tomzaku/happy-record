import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import RecordDayView from '../RecordDayView';
import RecordDayEdit from '../RecordDayEdit';

const RecordDay = ({ id, currentDay }: { id: string; currentDay: string }) => {
  const { addChecklistRecord, getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});
  React.useEffect(() => {
    const records = getChecklistRecords(id, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
    });
    console.log('records', records);
    setCurrentChecklistRecords(Object.values(records));
  }, [id]);
  if (Object.values(currentChecklistRecords).length) {
    return <RecordDayView id={id} records={currentChecklistRecords} />;
  } else {
    return <RecordDayEdit id={id} />;
  }
};

export default RecordDay;
