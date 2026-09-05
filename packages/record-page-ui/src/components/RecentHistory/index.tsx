import React from 'react';
import cx from 'classnames';
import { format, isToday, isYesterday } from 'date-fns';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { useChecklistTemplates, useSyncedSelector, useRecordField, useSession } from '@dreamer/global';
import { useChecklistRecord, ChecklistRecord } from '@dreamer/global/src/store/checklist-record';
import { useChecklistLogs, ChecklistLog } from '@dreamer/global/src/store/checklist-logs';
import styles from './index.module.scss';

// Scroll-triggered pagination grows the fetch window by this much per page,
// starting here, capped by checklist-logs' own server-side max
// (`limitFrom(ctx.url, 50, 200)` in checklist-logs-context.ts) — the
// tighter of the two sources' own caps (checklist-records' is 5000).
const PAGE_SIZE = 50;
const MAX_WINDOW = 200;

// Fallback for a task whose own template failed to load (or was deleted) —
// same neutral grey/icon ChecklistToday's own rows fall back to.
const FALLBACK_COLOR = '#8A8A8A';
const FALLBACK_ICON = 'solar:checklist-linear';

type Detail = { label: string; value: string; unit?: string };
// A row is exactly one of three real activity kinds, not "details or a
// status string" — driving the icon/color/wording from one field instead of
// inferring it from `details.length` (the old shape) is what makes a
// recorded submission with no *visible* details (an all-note-fields
// submission — see detailsFor) render as "Recorded", not fall through to
// "Marked done" the way it silently used to.
type EntryKind = 'recorded' | 'completed' | 'uncompleted';
type Entry = {
  key: string;
  timestamp: string;
  title: string;
  details: Detail[];
  kind: EntryKind;
  /** The task's own avatar (see ChecklistTemplate['avatar']) — the same
   * colored icon ChecklistToday's rows use, so an activity entry reads as
   * "this task" at a glance instead of every row looking identical. */
  icon: string;
  color: string;
};

// `color` is passed straight to the Icon below rather than left to CSS
// `color` inheritance — Icon's own stylesheet sets `fill`/`color` off an
// `--icon-color` custom property that's never actually defined anywhere in
// this app, so every other colored icon in the codebase (ChecklistToday's
// own rows included) passes `color` as a real prop for the same reason.
const KIND_STYLE: Record<EntryKind, { icon: string; color: string; className: string }> = {
  recorded: { icon: 'solar:clipboard-list-linear', color: 'var(--checkbox-accent-color)', className: styles.rowStatusRecorded },
  completed: { icon: 'solar:check-circle-bold', color: 'var(--icon-success, #22c55e)', className: styles.rowStatusDone },
  uncompleted: { icon: 'solar:close-circle-linear', color: 'var(--text-description-color)', className: styles.rowStatusUndone },
};

type DateGroup = { dateKey: string; label: string; entries: Entry[] };

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
// Calendar/History switcher over the one shared card, and its own
// calendar-panel teaser), this just renders the list content — every one of
// its three mount points scrolls its own bounded area and loads more as the
// user nears its bottom.
const RecentHistory = () => {
  const intl = useIntl();
  const { ready: sessionReady, userId } = useSession();
  const { checklistTemplate } = useChecklistTemplates();
  const { getChecklistRecords } = useChecklistRecord();
  const { getAllRecordFields } = useRecordField();

  // Grows on scroll — see the IntersectionObserver effect below.
  const [windowSize, setWindowSize] = React.useState(PAGE_SIZE);

  const fields = useSyncedSelector(getAllRecordFields);
  const fieldsById = React.useMemo(() => new Map(fields.map(field => [field.id, field])), [fields]);

  const groups = useSyncedSelector(getChecklistRecords, '', {
    type: 'time' as const,
    sortBy: 'createdAt' as const,
    sortDirection: 'desc' as const,
    limit: windowSize,
  });

  const submissionEntries: Entry[] = React.useMemo(
    () => Object.entries(groups).map(([submittedAt, records]) => {
      const template = checklistTemplate[records[0].checklistTemplateId];
      return {
        key: `submission:${submittedAt}`,
        timestamp: submittedAt,
        title: template?.title ?? intl.formatMessage({ id: 'recent-history.unknown-task', defaultMessage: 'Task' }),
        details: detailsFor(records, fieldsById),
        kind: 'recorded' as const,
        icon: template?.avatar.name || FALLBACK_ICON,
        color: template?.avatar.color || FALLBACK_COLOR,
      };
    }),
    [groups, checklistTemplate, fieldsById, intl],
  );

  // A submission is only ever created when a task actually has fields to
  // record — a plain check/uncheck task (no fields at all) just sets
  // `completedAt` directly on its Checklist row and never gets one (see
  // CLAUDE.md: "Checklist.completedAt is also how a plain check/uncheck-style
  // day gets recorded, with no fields involved"). Without pulling those in
  // too, this widget silently skipped every check-only task, submission-based
  // ones only. checklist_logs' own `update`/`completed` rows are what surface
  // those now — one indexed query for "recently completed," replacing what
  // used to be a day-by-day scan over every checklist in a fixed lookback
  // window (see git history on this file for that shape).
  const submittedChecklistIds = React.useMemo(() => {
    const ids = new Set<string>();
    Object.values(groups).forEach(records => records.forEach(record => ids.add(record.checklistId)));
    return ids;
  }, [groups]);

  const { logs: checklistLogs, isFetching: isFetchingLogs } = useChecklistLogs({
    create: false,
    delete: false,
    limit: windowSize,
  });

  // Every check/uncheck of a plain task writes its own immutable
  // checklist_logs row ('completed' or 'uncompleted' — see
  // checklists-service.ts's completedAt-transition logging), and each one is
  // shown as its own timeline entry rather than collapsed to "current state" —
  // a task checked at 7:00 and unchecked at 12:00 shows both.
  const checklistLogEntries: Entry[] = React.useMemo(
    () =>
      checklistLogs
        .filter(
          (log): log is ChecklistLog & { checklistId: string; detail: 'completed' | 'uncompleted' } =>
            (log.detail === 'completed' || log.detail === 'uncompleted')
            && !!log.checklistId
            // A checked-off task that also has field submissions already shows
            // up via submissionEntries — skip its 'completed' row to avoid a
            // duplicate entry (its 'uncompleted' row, if any, still shows).
            && !(log.detail === 'completed' && submittedChecklistIds.has(log.checklistId)),
        )
        .map(log => {
          const template = checklistTemplate[log.checklistTemplateId];
          return {
            key: `checklist:${log.id}`,
            timestamp: log.createdAt,
            title: template?.title ?? intl.formatMessage({ id: 'recent-history.unknown-task', defaultMessage: 'Task' }),
            details: [],
            kind: log.detail,
            icon: template?.avatar.name || FALLBACK_ICON,
            color: template?.avatar.color || FALLBACK_COLOR,
          };
        }),
    [checklistLogs, submittedChecklistIds, checklistTemplate, intl],
  );

  const entries = React.useMemo(
    () =>
      [...submissionEntries, ...checklistLogEntries].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [submissionEntries, checklistLogEntries],
  );

  // `entries` is already sorted newest-first, so a single pass bucketing by
  // calendar day preserves both the group order (newest day first) and each
  // group's own row order — no separate sort needed. `Map` (not a plain
  // object) purely so insertion order — the order this loop actually visits
  // days in — is what iteration order falls out of.
  const dateGroups: DateGroup[] = React.useMemo(() => {
    const byDay = new Map<string, Entry[]>();
    for (const entry of entries) {
      const dateKey = format(new Date(entry.timestamp), 'yyyy-MM-dd');
      const bucket = byDay.get(dateKey);
      if (bucket) bucket.push(entry);
      else byDay.set(dateKey, [entry]);
    }
    return Array.from(byDay.entries()).map(([dateKey, dayEntries]) => {
      const date = new Date(dayEntries[0].timestamp);
      const label = isToday(date)
        ? intl.formatMessage({ id: 'recent-history.today', defaultMessage: 'Today' })
        : isYesterday(date)
          ? intl.formatMessage({ id: 'recent-history.yesterday', defaultMessage: 'Yesterday' })
          : format(date, 'EEEE, MMM d');
      return { dateKey, label, entries: dayEntries };
    });
  }, [entries, intl]);

  // Once a settled page (isFetchingLogs false, so `checklistLogs`/`groups`
  // reflect the current `windowSize`, not a still-in-flight one — see
  // useChecklistLogs' own `keepPreviousData` note) comes back shorter than
  // what was asked for on *both* sources, there's nothing further to load —
  // stop growing the window and hide the sentinel. Also waits on the
  // session itself: before it's ready, `useChecklistLogs`' query is still
  // `enabled: false` (so `isFetchingLogs` reads false too, not "loading"),
  // and both sources really are empty for a reason that has nothing to do
  // with having reached the end.
  const [exhausted, setExhausted] = React.useState(false);
  React.useEffect(() => {
    if (!sessionReady || !userId || isFetchingLogs) return;
    const recordCount = Object.values(groups).flat().length;
    if (checklistLogs.length < windowSize && recordCount < windowSize) {
      setExhausted(true);
    }
  }, [sessionReady, userId, isFetchingLogs, checklistLogs.length, groups, windowSize]);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (exhausted || isFetchingLogs || windowSize >= MAX_WINDOW) return;
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setWindowSize(size => Math.min(size + PAGE_SIZE, MAX_WINDOW));
        }
      },
      { root, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [exhausted, isFetchingLogs, windowSize]);

  // Only checklist-logs' own fetch is tracked here (getChecklistRecords is
  // the fire-and-forget background-sync shape — see useChecklistRecord.ts —
  // with no isFetching of its own), same proxy the exhausted-check above
  // already relies on. `isFetchingLogs` alone can't tell three different
  // moments apart, so `settledWindowSize` (the last `windowSize` a fetch
  // actually completed for) is what splits them:
  //  - entries still empty: the very first page landing (isInitialLoading).
  //  - windowSize grew past what last settled: the scroll-triggered page
  //    grow itself in flight (isLoadingMore) — bottom, near the sentinel.
  //  - windowSize unchanged but fetching again: some other write on the
  //    page (marking a task done, submitting a record) invalidated this
  //    query and it's refetching the same window (isRefetching) — top,
  //    since that's new activity that'll land above what's already shown.
  const settledWindowSizeRef = React.useRef(windowSize);
  React.useEffect(() => {
    if (!isFetchingLogs) settledWindowSizeRef.current = windowSize;
  }, [isFetchingLogs, windowSize]);

  const isInitialLoading = isFetchingLogs && entries.length === 0;
  const isLoadingMore = isFetchingLogs && entries.length > 0 && windowSize > settledWindowSizeRef.current;
  const isRefetching = isFetchingLogs && entries.length > 0 && !isLoadingMore;

  return (
    <div className={styles.container} ref={containerRef}>
      {isInitialLoading ? (
        <div className={styles.stateContainer}>
          <Icon width={24} icon="svg-spinners:180-ring" />
        </div>
      ) : entries.length === 0 ? (
        <div className={styles.stateContainer}>
          <Typography.Text className={styles.emptyText}>
            {intl.formatMessage({ id: 'recent-history.empty', defaultMessage: 'No activity yet' })}
          </Typography.Text>
        </div>
      ) : (
        <div className={styles.list}>
          {isRefetching && (
            <div className={styles.loadingTop}>
              <Icon width={16} icon="svg-spinners:180-ring" />
            </div>
          )}
          {dateGroups.map(group => (
            <div key={group.dateKey} className={styles.group}>
              <Typography.Text className={styles.groupLabel}>{group.label}</Typography.Text>
              {group.entries.map(entry => {
                const statusStyle = KIND_STYLE[entry.kind];
                return (
                  <div key={entry.key} className={styles.row}>
                    <Icon className={styles.rowIcon} width={24} height={24} color={entry.color} icon={entry.icon} />
                    <div className={styles.rowBody}>
                      <div className={styles.rowMain}>
                        <Typography.Text className={styles.rowTitle}>{entry.title}</Typography.Text>
                        <Typography.Text className={styles.rowTime}>
                          {format(new Date(entry.timestamp), 'p')}
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
                        // A plain check/uncheck task has no fields to list, and a
                        // recorded submission whose only fields were note-type
                        // ones has nothing detailsFor could show either — either
                        // way, say what actually happened instead of leaving the
                        // row looking like a submission with nothing in it.
                        <div className={cx(styles.rowStatus, statusStyle.className)}>
                          <Icon width={13} color={statusStyle.color} icon={statusStyle.icon} />
                          <Typography.Text className={styles.rowStatusText}>
                            {entry.kind === 'uncompleted' &&
                              intl.formatMessage({ id: 'recent-history.marked-not-done', defaultMessage: 'Marked not done' })}
                            {entry.kind === 'completed' &&
                              intl.formatMessage({ id: 'recent-history.marked-done', defaultMessage: 'Marked done' })}
                            {entry.kind === 'recorded' &&
                              intl.formatMessage({ id: 'recent-history.recorded', defaultMessage: 'Recorded' })}
                          </Typography.Text>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {isLoadingMore && (
            <div className={styles.loadingMore}>
              <Icon width={20} icon="svg-spinners:180-ring" />
            </div>
          )}
          {!exhausted && <div ref={sentinelRef} className={styles.sentinel} />}
        </div>
      )}
    </div>
  );
};

export default RecentHistory;
