import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@iconify/react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';

import { startOfMonth, endOfMonth } from 'date-fns';
import { RecordField } from '@dreamer/global/src/store/record-field';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import Input from '@moon-ui/input';

const RecordDayHistory = ({
  checklistTemplateId,
  fields,
}: {
  checklistTemplateId: string;
  fields: RecordField[];
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
  const [editActiveId, setEditActiveId] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      {Object.entries(records).map(([key, checklistRecords]) => (
        <div className={styles.dateSection}>
          <Typography.Text>{new Date(key).toLocaleString()}</Typography.Text>
          {checklistRecords.map(r => {
            const recordField = currentRecordField[r.fieldId];
            return (
              <List.ItemMeta
                logo={<Icon width={24} icon={recordField.icon} />}
                title={recordField.title}
                rightComponent={
                  <>
                    {editActiveId === r.id ? (
                      <Input
                        value={r.value}
                        ref={inputRef}
                        autoFocus
                        border="dash"
                        className={styles.input}
                        onBlur={() => {
                          console.log('>>>ON BLUR???');
                          updateChecklistRecord(r.id, {
                            checklistTemplateId: r.checklistTemplateId,
                            value: Number(inputRef.current?.value),
                          });
                          setRecords(prev => {
                            return {
                              ...prev,
                              [key]: prev[key].map(record => {
                                if (record.id === r.id) {
                                  return {
                                    ...record,
                                    value: Number(inputRef.current?.value),
                                  };
                                }
                                return record;
                              }),
                            };
                          });
                          setEditActiveId('');
                        }}
                      />
                    ) : (
                      <Typography.Text>{r.value}</Typography.Text>
                    )}
                    <Typography.Text>&nbsp;{recordField.unit}</Typography.Text>
                    <Icon
                      width={24}
                      className={styles.iconEdit}
                      onClick={() => {
                        setEditActiveId(r.id);
                        setTimeout(() => inputRef?.current?.focus(), 100);
                      }}
                      icon="solar:pen-2-line-duotone"
                    />
                  </>
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default RecordDayHistory;
