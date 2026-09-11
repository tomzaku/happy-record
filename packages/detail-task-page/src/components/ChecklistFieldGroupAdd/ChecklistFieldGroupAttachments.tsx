import React from 'react';
import { ChecklistTemplate, useSyncedSelector } from '@dreamer/global';
import { useChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { startOfMonth, endOfMonth } from 'date-fns';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { MediaFieldPreview } from './MediaFieldInput';
import styles from './ChecklistFieldGroupAttachments.module.scss';

type Props = {
  checklistTemplate: ChecklistTemplate;
  // Already filtered to this group's photo/video fields by the caller (see
  // ChecklistFieldGroupAdd's own `mediaFields`) — this component has nothing to render for any
  // other field type.
  fields: RecordField[];
};

/** This group's own photo/video check-ins, newest first — the read-only replacement for the full
 * editable submission history in this collapsible slot (see ChecklistFieldGroupAdd's own
 * historyHeader/historyContent). */
const ChecklistFieldGroupAttachments = ({ checklistTemplate, fields }: Props) => {
  const intl = useIntl();
  const { getChecklistRecords } = useChecklistRecord();
  const fieldIds = fields.map(field => field.id);
  const range = {
    from: startOfMonth(new Date()).toISOString(),
    to: endOfMonth(new Date()).toISOString(),
  };
  const records = useSyncedSelector(getChecklistRecords, checklistTemplate.id, {
    rangeDate: range,
    fieldIds,
    sortDirection: 'desc' as const,
  });
  const attachments = Object.values(records)
    .flat()
    .filter(record => typeof record.value === 'string');

  if (attachments.length === 0) {
    return (
      <Typography.Text className={styles.emptyText}>
        {intl.formatMessage({
          id: 'checklist-field-group-add.no-attachments',
          defaultMessage: 'No attachments yet',
        })}
      </Typography.Text>
    );
  }

  return (
    <div className={styles.grid}>
      {attachments.map(record => {
        const field = fields.find(f => f.id === record.fieldId);
        if (!field) return null;
        return (
          <div key={record.id} className={styles.item}>
            <MediaFieldPreview kind={field.type as 'photo' | 'video'} mediaId={record.value as string} />
            <Typography.Text className={styles.date}>
              {new Date(record.createdAt).toLocaleDateString()}
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
};

export default ChecklistFieldGroupAttachments;
