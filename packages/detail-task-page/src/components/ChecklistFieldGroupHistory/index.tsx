import React from 'react';
import { ChecklistTemplate } from '@dreamer/global';
import {
  ChecklistRecord,
  useChecklistRecord,
} from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { startOfMonth, endOfMonth } from 'date-fns';
import Typography from '@moon-ui/typography';
import ChecklistFieldGeneral from '../ChecklistFieldGeneral';
import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
};
const ChecklistFieldGroupHistory = ({ checklistTemplate, fields }: Props) => {
  const { getChecklistRecords, updateChecklistRecord } = useChecklistRecord();
  const [records, setRecords] = React.useState<
    Record<string, ChecklistRecord[]>
  >({});

  React.useEffect(() => {
    const records = getChecklistRecords(checklistTemplate.id, {
      rangeDate: {
        from: startOfMonth(new Date()).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
      },
      type: 'time',
      fieldIds: fields.map(field => field.id),
      sortDirection: 'desc',
    });
    setRecords(records);
  }, []);
  return (
    <div className={styles.recordSection}>
      {Object.entries(records).map(([key, checklistRecords], index) => (
        <div>
          <div className={styles.hrContainer}>
            <div className={cx(styles.hr, index === 0 && styles.noHr)} />

            <Typography.Text className={styles.dateText}>
              {new Date(key).toLocaleString()}
            </Typography.Text>
            <div className={cx(styles.hr, index === 0 && styles.noHr)} />
          </div>

          {checklistRecords.map(checklistRecord => (
            <ChecklistFieldGeneral record={checklistRecord} fields={fields} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChecklistFieldGroupHistory;
