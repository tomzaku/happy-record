import React from 'react';
import { ChecklistTemplate, useSyncedSelector } from '@dreamer/global';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
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

/**
 * Metric fields only — a `type: 'note'` field has no per-day history to show here anymore (see
 * ChecklistFieldGeneral's own comment); `fields` may still include note-type ones (this group's
 * full field list), so this filters down to what it actually renders rather than assuming the
 * caller already narrowed it.
 */
const ChecklistFieldGroupHistory = ({ checklistTemplate, fields }: Props) => {
  const { getChecklistRecords, deleteChecklistRecord } = useChecklistRecord();
  const metricFieldIds = fields.filter(field => field.type === 'metric').map(field => field.id);
  // Derived straight from the store's own function every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a record submitted or edited on another device, or even on
  // this one, now actually shows up here.
  const records = useSyncedSelector(getChecklistRecords, checklistTemplate.id, {
    rangeDate: {
      from: startOfMonth(new Date()).toISOString(),
      to: endOfMonth(new Date()).toISOString(),
    },
    type: 'time' as const,
    fieldIds: metricFieldIds,
    sortDirection: 'desc' as const,
  });
  return (
    <div className={styles.recordSection}>
      {Object.entries(records).length === 0 && (
        <Typography.Text className={styles.noRecordText}>No record found</Typography.Text>
      )}
      {Object.entries(records).map(([key, checklistRecords], index) => (
        <div key={key} className={styles.recordContainer}>
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
                // `records` is derived from the store — no local copy to
                // update; the delete above already updates the shared store,
                // and this component re-renders with the fresh derivation.
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
              key={checklistRecord.id}
              record={checklistRecord}
              // `records` is derived from the store — ChecklistFieldGeneral's
              // own `updateChecklistRecord` call already updates it; nothing
              // to echo back locally.
              setRecord={() => {}}
              fields={fields}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default ChecklistFieldGroupHistory;
