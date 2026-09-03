import React from 'react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useChecklistTemplates, useSyncedSelector, useRecordField, useChecklist } from '@dreamer/global';
import { useChecklistRecord, ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import styles from './index.module.scss';

// How many of the most recent activity rows (across every task) this widget
// shows — a home-page glance, not a full history browser (that's
// detail-task-page's own per-task History tab).
const RECENT_LIMIT = 30;

// How far back to look for plain check/uncheck completions (see below) — a
// checklist has no `submittedAt` of its own to sort by the way a submission
// does, so this has to be a bounded day-range fetch, not an unbounded one.
const COMPLETED_LOOKBACK_DAYS = 30;

type Detail = { label: string; value: string; unit?: string };
type Entry = { key: string; timestamp: string; title: string; details: Detail[] };

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
  const { ensureChecklistsFetched, getChecklistForDateWithoutFetching } = useChecklist();

  const fields = useSyncedSelector(getAllRecordFields);
  const fieldsById = React.useMemo(() => new Map(fields.map(field => [field.id, field])), [fields]);

  const groups = useSyncedSelector(getChecklistRecords, '', {
    type: 'time' as const,
    sortBy: 'createdAt' as const,
    sortDirection: 'desc' as const,
    limit: RECENT_LIMIT,
  });

  const submissionEntries: Entry[] = React.useMemo(
    () => Object.entries(groups).map(([submittedAt, records]) => ({
      key: `submission:${submittedAt}`,
      timestamp: submittedAt,
      title: checklistTemplate[records[0].checklistTemplateId]?.title
        ?? intl.formatMessage({ id: 'recent-history.unknown-task', defaultMessage: 'Task' }),
      details: detailsFor(records, fieldsById),
    })),
    [groups, checklistTemplate, fieldsById, intl],
  );

  // A submission is only ever created when a task actually has fields to
  // record — a plain check/uncheck task (no fields at all) just sets
  // `completedAt` directly on its Checklist row and never gets one (see
  // CLAUDE.md: "Checklist.completedAt is also how a plain check/uncheck-style
  // day gets recorded, with no fields involved"). Without pulling those in
  // too, this widget silently skipped every check-only task, submission-based
  // ones only.
  const rangeStart = React.useMemo(() => subDays(new Date(), COMPLETED_LOOKBACK_DAYS), []);
  const rangeEnd = React.useMemo(() => new Date(), []);

  React.useEffect(() => {
    ensureChecklistsFetched({ from: rangeStart, to: rangeEnd });
  }, [ensureChecklistsFetched, rangeStart, rangeEnd]);

  const submittedChecklistIds = React.useMemo(() => {
    const ids = new Set<string>();
    Object.values(groups).forEach(records => records.forEach(record => ids.add(record.checklistId)));
    return ids;
  }, [groups]);

  // Same day-by-day loop as WeeklyCalendarVertical's own `tasksByDay` —
  // `getChecklistForDateWithoutFetching` is a pure read over whatever
  // `ensureChecklistsFetched` above has already merged into the store.
  const completedEntries: Entry[] = React.useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const result: Entry[] = [];
    days.forEach(date => {
      const { checklist } = getChecklistForDateWithoutFetching({ date });
      Object.values(checklist).forEach(item => {
        // A checked-off task that also has field submissions already shows
        // up via submissionEntries — skip it here to avoid a duplicate row.
        if (!item.completedAt || submittedChecklistIds.has(item.id)) return;
        result.push({
          key: `checklist:${item.id}`,
          timestamp: item.completedAt,
          title: checklistTemplate[item.checklistTemplateId]?.title
            ?? intl.formatMessage({ id: 'recent-history.unknown-task', defaultMessage: 'Task' }),
          details: [],
        });
      });
    });
    return result;
  }, [rangeStart, rangeEnd, getChecklistForDateWithoutFetching, submittedChecklistIds, checklistTemplate, intl]);

  const entries = React.useMemo(
    () =>
      [...submissionEntries, ...completedEntries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, RECENT_LIMIT),
    [submissionEntries, completedEntries],
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
          {entries.map(entry => (
            <div key={entry.key} className={styles.row}>
              <div className={styles.rowMain}>
                <Typography.Text className={styles.rowTitle}>{entry.title}</Typography.Text>
                <Typography.Text className={styles.rowTime}>
                  {format(new Date(entry.timestamp), 'MMM d, p')}
                </Typography.Text>
              </div>
              {entry.details.length > 0 ? (
                <div className={styles.rowDetails}>
                  {entry.details.map((detail, index) => (
                    <Typography.Text key={index} className={styles.rowDetailItem}>
                      {detail.label}: {detail.value}
                      {detail.unit ? ` ${detail.unit}` : ''}
                    </Typography.Text>
                  ))}
                </div>
              ) : (
                // A plain check/uncheck task has no fields to list — the
                // completion itself is the whole story, so say so instead of
                // leaving the row looking like a submission with nothing in it.
                <Typography.Text className={styles.rowCompleted}>
                  {intl.formatMessage({ id: 'recent-history.marked-done', defaultMessage: 'Marked done' })}
                </Typography.Text>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentHistory;
