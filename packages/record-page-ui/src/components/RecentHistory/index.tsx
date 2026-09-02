import React from 'react';
import { format } from 'date-fns';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useChecklistTemplates, useSyncedSelector, useRecordField } from '@dreamer/global';
import { useChecklistRecord, ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import styles from './index.module.scss';

// How many of the most recent submissions (across every task) this widget
// shows — a home-page glance, not a full history browser (that's
// detail-task-page's own per-task History tab).
const RECENT_LIMIT = 30;

type Detail = { label: string; value: string; unit?: string };

// A number/text/date/datetime record's own value is safe to show inline — a
// note-type field's own entry is real Editor.js OutputData (an object),
// silently left out rather than dumping raw JSON, same as
// detail-task-page's own HistoryList.
const detailsFor = (
  records: ChecklistRecord[],
  fieldsById: Map<string, { title: string; unit?: string }>,
): Detail[] =>
  records
    .filter((record): record is ChecklistRecord & { value: number | string } => typeof record.value !== 'object')
    .map(record => {
      const field = fieldsById.get(record.fieldId);
      return {
        label: field?.title ?? record.fieldId,
        value: String(record.value),
        unit: field?.unit,
      };
    });

// Recent activity across every task — the home page's own per-task cards
// already show today's state, so this is deliberately cross-template (an
// unscoped `getChecklistRecords('', ...)` call, see CLAUDE.md's "online-first
// data layer" on what an empty checklistTemplateId scope means), grouped by
// submission (`type: 'time'`) so every field submitted in one Submit click
// still reads as one entry. No Card/title of its own — the home page's right
// column already provides that chrome (see index.desktop.tsx's own
// Calendar/History switcher over the one shared card), this just renders the
// list content.
const RecentHistory = () => {
  const intl = useIntl();
  const { checklistTemplate } = useChecklistTemplates();
  const { getChecklistRecords } = useChecklistRecord();
  const { getAllRecordFields } = useRecordField();

  const fields = useSyncedSelector(getAllRecordFields);
  const fieldsById = React.useMemo(() => new Map(fields.map(field => [field.id, field])), [fields]);

  const groups = useSyncedSelector(getChecklistRecords, '', {
    type: 'time' as const,
    sortBy: 'createdAt' as const,
    sortDirection: 'desc' as const,
    limit: RECENT_LIMIT,
  });

  const entries = React.useMemo(
    () => Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()),
    [groups],
  );

  return (
    <div className={styles.container}>
      {entries.length === 0 ? (
        <div className={styles.stateContainer}>
          <Typography.Text className={styles.emptyText}>
            {intl.formatMessage({ id: 'recent-history.empty', defaultMessage: 'No activity yet' })}
          </Typography.Text>
        </div>
      ) : (
        <div className={styles.list}>
          {entries.map(([submittedAt, records]) => {
            const title = checklistTemplate[records[0].checklistTemplateId]?.title
              ?? intl.formatMessage({ id: 'recent-history.unknown-task', defaultMessage: 'Task' });
            const details = detailsFor(records, fieldsById);
            return (
              <div key={submittedAt} className={styles.row}>
                <div className={styles.rowMain}>
                  <Typography.Text className={styles.rowTitle}>{title}</Typography.Text>
                  <Typography.Text className={styles.rowTime}>
                    {format(new Date(submittedAt), 'MMM d, p')}
                  </Typography.Text>
                </div>
                {details.length > 0 && (
                  <div className={styles.rowDetails}>
                    {details.map((detail, index) => (
                      <Typography.Text key={index} className={styles.rowDetailItem}>
                        {detail.label}: {detail.value}
                        {detail.unit ? ` ${detail.unit}` : ''}
                      </Typography.Text>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentHistory;
