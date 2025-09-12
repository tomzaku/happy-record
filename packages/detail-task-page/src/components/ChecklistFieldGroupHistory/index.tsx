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
import Button from '@moon-ui/button/src/DefaultButton';
import Icon from '@moon-ui/icon/Icon';

type Props = {
  checklistTemplate: ChecklistTemplate;
  fields: RecordField[];
};
const ChecklistFieldGroupHistory = ({ checklistTemplate, fields }: Props) => {
  const { getChecklistRecords, updateChecklistRecord, deleteChecklistRecord } =
    useChecklistRecord();
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
        <div className={styles.recordContainer}>
          <div className={styles.hrContainer}>
            <div className={cx(styles.hrSide, index === 0 && styles.noHr)} />

            <Typography.Text className={styles.dateText}>
              {new Date(key).toLocaleString()}
            </Typography.Text>
            <div className={cx(styles.hr, index === 0 && styles.noHr)} />
            <Button
              type="dash"
              size="sm"
              className={styles.deleteButton}
              onClick={() => {
                checklistRecords.forEach(record => {
                  deleteChecklistRecord(record.id, {
                    checklistTemplateId: record.checklistTemplateId,
                  });
                });
                const newRecords = { ...records };
                delete newRecords[key];
                setRecords(newRecords);
              }}
            >
              <Icon
                icon="solar:trash-bin-trash-outline"
                className={styles.deleteIcon}
              />
              Delete
            </Button>
            <div className={cx(styles.hrSide, index === 0 && styles.noHr)} />
          </div>

          {checklistRecords.map(checklistRecord => (
            <ChecklistFieldGeneral
              record={checklistRecord}
              setRecord={record => {
                setRecords({
                  ...records,
                  [key]: records[key].map(r => {
                    if (r.id === record.id) {
                      return record;
                    }
                    return r;
                  }),
                });
              }}
              fields={fields}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChecklistFieldGroupHistory;
