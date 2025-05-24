import React from 'react';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';

import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import styles from './index.module.scss';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const RecordDayView = ({
  checklistTemplateId,
  fields,
  currentDay,
}: {
  checklistTemplateId: string;
  fields: RecordField[];
  currentDay: string;
}) => {
  const { getChecklistRecords } = useChecklistRecord();
  const [currentChecklistRecords, setCurrentChecklistRecords] = React.useState<
    ChecklistRecord[]
  >([]);
  const reloadChecklistRecord = () => {
    const records = getChecklistRecords(checklistTemplateId, {
      rangeDate: {
        from: new Date(new Date(currentDay).setHours(0, 0, 0, 0)).toISOString(),
        to: new Date(
          new Date(currentDay).setHours(23, 59, 59, 999),
        ).toISOString(),
      },
      fieldIds: fields.map(field => field.id),
    });
    setCurrentChecklistRecords(Object.values(records));
    return records;
  };
  React.useEffect(() => {
    reloadChecklistRecord();
  }, [checklistTemplateId]);
  return (
    <div className={styles.container}>
      <Icon
        width={100}
        color="rgba(16,154,0,0.16)"
        icon="ion:checkmark-done-circle-outline"
        className={styles.iconSuccess}
      />
      {fields.map(recordField => {
        const recordValues = Object.values(currentChecklistRecords)
          .flat()
          .filter(record => record.fieldId === recordField.id);
        const sumValue = sum(recordValues.map(record => record.value));
        return (
          <List.ItemMeta
            logo={<Icon width={24} icon={recordField.icon} />}
            title={recordField.title}
            rightComponent={
              <>
                <Typography.Text>
                  {sumValue} {recordField.unit}
                </Typography.Text>
              </>
            }
          />
        );
      })}
    </div>
  );
};

export default RecordDayView;
