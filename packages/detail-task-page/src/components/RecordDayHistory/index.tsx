import React from 'react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';

import { startOfMonth, endOfMonth } from 'date-fns';

const RecordDayHistory = ({
  checklistTemplateId,
}: {
  checklistTemplateId: string;
}) => {
  const { getChecklistRecords } = useChecklistRecord();
  const [records, setRecords] = React.useState<Record<string, ChecklistRecord>>(
    {},
  );
  React.useEffect(() => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
    });
    setRecords(records);
  }, [checklistTemplateId]);
  console.log('>RECORDS', records);
  return (
    <div>
      {Object.entries(records).map(([key, record]) => (
        <div>
          {key}
          {record.value}
        </div>
      ))}
    </div>
  );
};

export default RecordDayHistory;
