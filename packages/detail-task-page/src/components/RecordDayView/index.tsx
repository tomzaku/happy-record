import React from 'react';
import Input from '@moon-ui/input';
import List from '@moon-ui/list';
import Typography from '@moon-ui/typography';
import { Icon } from '@iconify/react';

import { ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import {
  RecordField,
  useRecordField,
} from '@dreamer/global/src/store/record-field';
import { useChecklistTemplates } from '@dreamer/global';
import styles from './index.module.scss';

const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

const RecordDayView = ({
  id,
  records,
}: {
  id: string;
  records: Record<string, ChecklistRecord[]>;
}) => {
  const { getRecordFields } = useRecordField();
  const [currentRecordFields, setCurrentRecordFields] = React.useState<
    RecordField[]
  >([]);
  const { getChecklistTemplate } = useChecklistTemplates();
  React.useEffect(() => {
    const checklistTemplate = getChecklistTemplate(id);
    const currentRecordFields = getRecordFields(checklistTemplate?.records);
    setCurrentRecordFields(currentRecordFields);
  }, []);
  return (
    <div className={styles.container}>
      <Icon
        width={100}
        color="rgba(16,154,0,0.16)"
        icon="ion:checkmark-done-circle-outline"
        className={styles.iconSuccess}
      />
      {Object.values(currentRecordFields).map((recordField, index) => {
        const recordValues = Object.values(records)
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
