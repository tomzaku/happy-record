import React from 'react';
import { ChecklistTemplate, useSyncedSelector } from '@dreamer/global';
import { ChecklistRecord, useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { useChecklistFieldNoteRecords } from '@dreamer/global/src/store/note/useNoteRecord';
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
 * Metric fields group by submission (`type: 'time'`, see useChecklistRecord.ts) same as always.
 * A `type: 'note'` field's own value is a checklist journal entry now — its own row in `notes`,
 * not a `checklist_records` row (see useNote.tsx's `Note` doc comment) — so it has no
 * `submissionId` of its own to group by; it's merged into the metric group sharing its
 * `checklistId` instead (every field submitted in one Submit click shares the same checklist
 * instance either way). A day with *only* a note field filled in gets its own group, keyed by
 * the note's own `createdAt`, same as a metric-only day would use its own `createdAt`.
 */
const ChecklistFieldGroupHistory = ({ checklistTemplate, fields }: Props) => {
  const { getChecklistRecords, deleteChecklistRecord } = useChecklistRecord();
  const { getChecklistFieldNotesInRange, deleteChecklistFieldNote } = useChecklistFieldNoteRecords();
  const metricFieldIds = fields.filter(field => field.type === 'metric').map(field => field.id);
  const noteFieldIds = fields.filter(field => field.type === 'note').map(field => field.id);
  const range = {
    from: startOfMonth(new Date()).toISOString(),
    to: endOfMonth(new Date()).toISOString(),
  };
  // Derived straight from the store's own function every render instead of
  // snapshotted into local state from a `useEffect(..., [])` that never
  // refired — a record submitted or edited on another device, or even on
  // this one, now actually shows up here.
  const metricRecords = useSyncedSelector(getChecklistRecords, checklistTemplate.id, {
    rangeDate: range,
    type: 'time' as const,
    fieldIds: metricFieldIds,
    sortDirection: 'desc' as const,
  });
  const noteRecords = useSyncedSelector(
    getChecklistFieldNotesInRange,
    checklistTemplate.id,
    noteFieldIds,
    range,
  );

  const groups = React.useMemo(() => {
    const merged: Record<string, ChecklistRecord[]> = {};
    for (const [key, records] of Object.entries(metricRecords)) {
      merged[key] = [...records];
    }
    const usedKeys = new Set(Object.keys(merged));
    for (const note of noteRecords) {
      const matchKey = Object.keys(merged).find(
        key => merged[key][0]?.checklistId === note.checklistId,
      );
      if (matchKey) {
        merged[matchKey] = [...merged[matchKey], note];
        continue;
      }
      let key = note.createdAt;
      while (usedKeys.has(key)) key = `${key}-${note.id}`;
      usedKeys.add(key);
      merged[key] = [note];
    }
    return merged;
  }, [metricRecords, noteRecords]);

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
                checklistRecords.forEach(record => {
                  if (metricFieldIds.includes(record.fieldId)) {
                    deleteChecklistRecord(record.id, {
                      checklistTemplateId: record.checklistTemplateId,
                    });
                  } else {
                    deleteChecklistFieldNote(record);
                  }
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
