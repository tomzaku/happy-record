import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { startOfMonth, endOfMonth } from 'date-fns';
import NoteEditor from '../NoteEditor';

const NoteHistory = ({
  fields,
  checklistId,
  checklistTemplateId,
  currentDay,
}: {
  fields: RecordField[];
  checklistId: string;
  checklistTemplateId: string;
  currentDay: string;
}) => {
  const { getChecklistRecords, updateChecklistRecord } = useChecklistRecord();
  const [records, setRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});
  const currentRecordField = fields.reduce(
    (acc: Record<string, RecordField>, r) => ({
      ...acc,
      [r.id]: r,
    }),
    {},
  );
  React.useEffect(() => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
      type: 'time',
      fieldIds: Object.keys(currentRecordField),
    });
    setRecords(records);
  }, [checklistTemplateId]);
  console.log('RECORDS', records);
  return (
    <div>
      {Object.entries(records).map(([date, records]) => {
        return (
          <div key={date}>
            <div>{new Date(date).toLocaleString()}</div>
            {records.map(record => {
              return (
                <NoteEditor hideToolBar value={String(record.value)} readOnly />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default NoteHistory;
