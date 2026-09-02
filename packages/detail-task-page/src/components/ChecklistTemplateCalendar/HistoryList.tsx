import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useChecklist, useSyncedSelector, Checklist } from '@dreamer/global';
import { useChecklistRecord, ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { RecordField } from '@dreamer/global/src/store/record-field';
import { format } from 'date-fns';
import styles from './HistoryList.module.scss';

type Props = {
  checklistTemplateId: string;
  fields: RecordField[];
  onDaySelect: (date: Date) => void;
};

type DateGroup = {
  dateKey: string;
  date: Date;
  items: Checklist[];
};

type Detail = { label: string; value: string };

// A number/text/date/datetime record's own value is safe to show inline —
// a note-type field's own entry is real Editor.js OutputData (an object),
// which has no one-line rendering here, so it's silently left out rather
// than dumping raw JSON. "If none, leave it empty" per this component's own
// brief: a day with only a note field filled in (or no field groups at
// all — a plain check/uncheck task) just shows the "Marked as done" line
// with nothing underneath.
const detailsFor = (records: ChecklistRecord[], fields: RecordField[]): Detail[] =>
  records
    .filter((record): record is ChecklistRecord & { value: number | string } => typeof record.value !== 'object')
    .map(record => ({
      label: fields.find(field => field.id === record.fieldId)?.title ?? record.fieldId,
      value: String(record.value),
    }));

// Every completed instance of this one template, newest first, grouped by
// the calendar day it belongs to (its own `startedAt`, same day a calendar
// cell represents — not `completedAt`, which is just a timestamp within
// that day). getAllChecklistWithTemplate is the one read function in
// useChecklists.tsx built to `await` a real answer rather than render
// whatever's cached and fill in later — exactly what a list like this
// wants, instead of the scoped range fetch the calendar views above use.
const HistoryList = ({ checklistTemplateId, fields, onDaySelect }: Props) => {
  const intl = useIntl();
  const { getAllChecklistWithTemplate } = useChecklist();
  const { getChecklistRecords } = useChecklistRecord();
  const [loading, setLoading] = React.useState(true);
  const [completed, setCompleted] = React.useState<Checklist[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAllChecklistWithTemplate(checklistTemplateId).then(all => {
      if (cancelled) return;
      setCompleted(all.filter(item => item.completedAt));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [checklistTemplateId, getAllChecklistWithTemplate]);

  // Grouped by day only so the fetch/read shape matches getChecklistRecords'
  // own `type: 'date'` grouping — re-keyed by checklistId right below, since
  // that's the real association a row here actually wants (two checklist
  // instances could in principle land on the same calendar day's group).
  const recordsByDay = useSyncedSelector(getChecklistRecords, checklistTemplateId, { type: 'date' as const });
  const recordsByChecklistId = React.useMemo(() => {
    const map = new Map<string, ChecklistRecord[]>();
    for (const records of Object.values(recordsByDay)) {
      for (const record of records) {
        const bucket = map.get(record.checklistId);
        if (bucket) bucket.push(record);
        else map.set(record.checklistId, [record]);
      }
    }
    return map;
  }, [recordsByDay]);

  const groups = React.useMemo<DateGroup[]>(() => {
    const map = new Map<string, DateGroup>();
    for (const item of completed) {
      const date = new Date(item.startedAt);
      const dateKey = format(date, 'yyyy-MM-dd');
      const existing = map.get(dateKey);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(dateKey, { dateKey, date, items: [item] });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [completed]);

  if (loading) {
    return (
      <div className={styles.stateContainer}>
        <Icon width={24} icon="svg-spinners:180-ring" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className={styles.stateContainer}>
        <Typography.Text className={styles.emptyText}>
          {intl.formatMessage({
            id: 'checklist-template-calendar.list-empty',
            defaultMessage: 'No completed days yet',
          })}
        </Typography.Text>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {groups.map(group => (
        <div key={group.dateKey} className={styles.group}>
          <Typography.Text className={styles.groupLabel}>
            {format(group.date, 'EEEE, MMM d, yyyy')}
          </Typography.Text>
          {group.items.map(item => {
            const details = detailsFor(recordsByChecklistId.get(item.id) ?? [], fields);
            return (
              <div key={item.id} className={styles.row} onClick={() => onDaySelect(new Date(item.startedAt))}>
                <div className={styles.rowMain}>
                  <Typography.Text className={styles.rowTitle}>{item.title}</Typography.Text>
                  <Typography.Text className={styles.rowDoneLabel}>
                    {intl.formatMessage({
                      id: 'checklist-template-calendar.marked-done',
                      defaultMessage: 'Marked as done',
                    })}
                  </Typography.Text>
                  {item.completedAt && (
                    <Typography.Text className={styles.rowTime}>
                      {format(new Date(item.completedAt), 'p')}
                    </Typography.Text>
                  )}
                </div>
                {details.length > 0 && (
                  <div className={styles.rowDetails}>
                    {details.map((detail, index) => (
                      <Typography.Text key={index} className={styles.rowDetailItem}>
                        {detail.label}: {detail.value}
                      </Typography.Text>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default HistoryList;
