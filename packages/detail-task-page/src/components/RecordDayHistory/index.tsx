import React from 'react';
import List from '@moon-ui/list';
import { Icon } from '@iconify/react';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';

import { startOfMonth, endOfMonth } from 'date-fns';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { useChecklistTemplates } from '@dreamer/global';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';
import Input from '@moon-ui/input';

const RecordDayHistory = ({
  checklistTemplateId,
}: {
  checklistTemplateId: string;
}) => {
  const { getChecklistRecords, updateChecklistRecord } = useChecklistRecord();
  const [records, setRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});
  const { getRecordFields } = useRecordField();
  const [currentRecordField, setCurrentRecordField] = React.useState<
    Record<string, RecordField>
  >({});
  const { getChecklistTemplate } = useChecklistTemplates();
  React.useEffect(() => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
      type: 'time',
    });
    setRecords(records);

    const checklistTemplate = getChecklistTemplate(checklistTemplateId);
    const currentRecordField = getRecordFields(
      checklistTemplate?.records,
    ).reduce(
      (acc, r) => ({
        ...acc,
        [r.id]: r,
      }),
      {},
    );
    setCurrentRecordField(currentRecordField);
  }, [checklistTemplateId]);
  const [editActiveId, setEditActiveId] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div>
      {Object.entries(records).map(([key, checklistRecords]) => (
        <div className={styles.dateSection}>
          {new Date(key).toLocaleString()}
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
                            console.log('prev', checklistTemplateId);
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
