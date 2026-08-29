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
 * Metric and note fields both group by submission now (`type: 'time'`, see
 * useChecklistRecord.ts) — a `type: 'note'` field's own value is a checklist journal entry
 * (its own row in `notes`, routed there server-side, see checklist-records/index.ts) but comes
 * back from `getChecklistRecords` in the exact same `ChecklistRecord` shape with a real
 * `submissionId`, so it groups with whatever metric fields were submitted alongside it — or gets
 * its own singleton group on a day with only a note field filled in — with no client-side merge
 * needed.
 */
const ChecklistFieldGroupHistory = ({ checklistTemplate, fields }: Props) => {
  const { getChecklistRecords, deleteChecklistRecord } = useChecklistRecord();
  const fieldIds = fields.map(field => field.id);
  const range = {
    from: startOfMonth(new Date()).toISOString(),
    to: endOfMonth(new Date()).toISOString(),
  };
  // Derived straight from the store's own function every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a record submitted or edited on another device, or even on
  // this one, now actually shows up here.
  const groups = useSyncedSelector(getChecklistRecords, checklistTemplate.id, {
    rangeDate: range,
    type: 'time' as const,
    fieldIds,
    sortDirection: 'desc' as const,
  });

  return (
    <div className={styles.recordSection}>
      {Object.entries(groups).length === 0 && (
        <Typography.Text className={styles.noRecordText}>No record found</Typography.Text>
      )}
      {Object.entries(groups).map(([key, checklistRecords], index) => (
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
                // Uniform now regardless of field type — deleteChecklistRecord's own server-side
                // remove() deletes from both `checklist_records` and `notes` unconditionally by
                // id (harmless no-op on whichever table doesn't have that id), so there's no
                // client-side branch left to make.
                checklistRecords.forEach(record => {
                  deleteChecklistRecord(record.id, {
                    checklistTemplateId: record.checklistTemplateId,
                  });
                });
                // `groups` is derived from the store — no local copy to
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
              // `groups` is derived from the store — ChecklistFieldGeneral's
              // own update calls already update it; nothing to echo back
              // locally.
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
