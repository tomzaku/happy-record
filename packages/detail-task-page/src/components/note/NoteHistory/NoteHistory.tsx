import React from 'react';
import { RecordField } from '@dreamer/global/src/store/record-field';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { startOfMonth, endOfMonth } from 'date-fns';
import NoteEditor from '@moon-ui/note-editor';
import styles from './index.module.scss';
import Button from '@moon-ui/button/src/DefaultButton';
import Typography from '@moon-ui/typography';
import { useAiNoteGenerate } from '@dreamer/global/src/hook';

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
  // "/ai" inside each editor below — see add-note-page-ui's own AddNotePage for the same wiring.
  const { isPro, generate } = useAiNoteGenerate();
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
  const [activeRecord, setActiveRecord] = React.useState<ChecklistRecord>();
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
  return (
    <div>
      {Object.entries(records).map(([date, records]) => {
        return (
          <div key={date}>
            <div className={styles.header}>
              <Typography.Text>
                {new Date(date).toLocaleString()}
              </Typography.Text>
            </div>
            {records.map(record => {
              const isActive = activeRecord?.id === record.id;
              return (
                <div>
                  <NoteEditor
                    onClickEdit={() => {
                      setActiveRecord(record);
                    }}
                    classes={{
                      container: styles.editor,
                    }}
                    value={record.value}
                    setValue={value =>
                      setActiveRecord(prev => ({
                        ...prev,
                        value,
                      }))
                    }
                    ai={{ isPro, generate }}
                    shouldShowSaveButton
                    readOnly={!isActive}
                    onClickSave={() => {
                      updateChecklistRecord(record.id, {
                        value: activeRecord?.value || '',
                        checklistTemplateId,
                      });
                      setActiveRecord(undefined);
                    }}
                  />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default NoteHistory;
