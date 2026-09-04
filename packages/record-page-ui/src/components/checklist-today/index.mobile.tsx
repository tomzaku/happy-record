import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import styles from './index.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import AddInlineTask, { PendingInlineTask } from '../AddInlineTask';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';

const ChecklistToday = ({
  date,
  selectedTag,
}: {
  date: Date;
  selectedTag?: string;
}) => {
  const { getChecklistByGivingDate, updateChecklist, checklistsLoading } = useChecklist();
  const { checklistTemplate, templatesLoading } = useChecklistTemplates();
  const navigate = useNavigate();
  const intl = useIntl();

  // See ChecklistToday.desktop.tsx's comment on the equivalent fix: this
  // used to snapshot into local state from a `useEffect` keyed on
  // `[date, selectedTag, checklistTemplate]`, which never noticed
  // `selectedChecklistTemplates` changing — a template synced in for the
  // first time updates that list a beat after `checklistTemplate` itself
  // (useChecklistTemplates.tsx), and this component had no way to react to
  // it. Depending on `getChecklistByGivingDate` directly instead threads
  // through its whole underlying dependency chain correctly.
  const { checklist, checklistIds: checklistByGivingDateIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  // Optimistic placeholders for tasks that are still saving — see
  // AddInlineTask's and ChecklistToday.desktop.tsx's equivalent comments on
  // why creating a task's real Checklist row can't appear until its
  // template's own POST resolves.
  const [pendingTasks, setPendingTasks] = React.useState<PendingInlineTask[]>([]);
  const handleTaskCreateStart = React.useCallback((task: PendingInlineTask) => {
    setPendingTasks(prev => [...prev, task]);
  }, []);
  const handleTaskCreateEnd = React.useCallback((id: string) => {
    setPendingTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  // See ChecklistToday.desktop.tsx's equivalent check: empty here means
  // either "still fetching" or "genuinely nothing" — these flags are what
  // tell the two apart, so a fresh page load doesn't flash "No tasks
  // found!" before the real data has had a chance to arrive.
  if ((templatesLoading || checklistsLoading) && checklistByGivingDateIds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <Icon
          width={40}
          icon="svg-spinners:180-ring"
          className={styles.iconEmpty}
        />
        <Typography.Text>
          {intl.formatMessage({
            id: 'ChecklistToday.loading',
            defaultMessage: 'Fetching your tasks…',
          })}
        </Typography.Text>
      </div>
    );
  }

  // A pending optimistic task still counts as "something to show" even
  // before any real Checklist row exists — see ChecklistToday.desktop.tsx's
  // equivalent check.
  if (checklistByGivingDateIds.length === 0 && pendingTasks.length === 0) {
    return (
      <div>
        <div className={styles.emptyContainer}>
          <EmptyChecklistIllustration />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({
              id: 'ChecklistToday.no-record',
              defaultMessage: 'No tasks found!',
            })}
          </Typography.Title>
        </div>
        <AddInlineTask
          date={date}
          className={styles.addTaskButton}
          onTaskCreateStart={handleTaskCreateStart}
          onTaskCreateEnd={handleTaskCreateEnd}
        />
      </div>
    );
  }

  // Same completion-based grouping as ChecklistToday.desktop.tsx — see that
  // file's comment on why schedule *time* isn't a usable grouping key.
  const pendingIds = checklistByGivingDateIds.filter(id => !checklist[id]?.completedAt);
  const completedIds = checklistByGivingDateIds.filter(id => checklist[id]?.completedAt);

  const renderPendingRow = (task: PendingInlineTask, isLast: boolean) => (
    <div
      key={task.id}
      className={cx(styles.checklistItem, styles.pendingItem, isLast && styles.lastChecklistItem)}
    >
      <Icon width={32} height={32} icon="svg-spinners:180-ring" />
      <div className={styles.titleRow}>
        <Typography.Text className={styles.title}>{task.title}</Typography.Text>
        <span className={styles.pendingLabel}>
          {intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })}
        </span>
      </div>
    </div>
  );

  const renderRow = (id: string, isLast: boolean) => {
    const currentChecklist = checklist[id];
    const currentChecklistTemplate =
      checklistTemplate[currentChecklist.checklistTemplateId];
    return (
      <div
        key={id}
        className={cx(
          styles.checklistItem,
          isLast && styles.lastChecklistItem,
          currentChecklist?.completedAt && styles.completedItem,
        )}
      >
        <Icon
          color={currentChecklistTemplate?.avatar.color || '#8A8A8A'}
          width={32}
          height={32}
          icon={currentChecklistTemplate?.avatar.name}
        />
        <div
          onClick={() => {
            const baseUrl = `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}`;
            const checklistIdParam = currentChecklist.clientOnly
              ? ''
              : `&checklistId=${currentChecklist.id}`;
            navigate(baseUrl + checklistIdParam);
          }}
          className={styles.titleRow}
        >
          <Typography.Text className={styles.title}>
            {currentChecklistTemplate?.title}
          </Typography.Text>
          {/* Same badge as ChecklistToday.desktop.tsx's own — mobile just
              never got it, not a deliberate omission. */}
          {currentChecklistTemplate?.visibility === 'public' && (
            <span className={styles.publicBadge}>
              {intl.formatMessage({
                id: 'ChecklistToday.public-badge',
                defaultMessage: 'Public',
              })}
            </span>
          )}
        </div>
        <Checkbox
          defaultChecked={Boolean(currentChecklist?.completedAt)}
          className={styles.checkbox}
          onChange={event => {
            event.stopPropagation();
            updateChecklist({
              ...currentChecklist,
              completedAt: event.target.checked
                ? new Date().toISOString()
                : undefined,
            });
          }}
        />
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {pendingIds.map((id, index) =>
        renderRow(id, completedIds.length === 0 && pendingTasks.length === 0 && index === pendingIds.length - 1),
      )}
      {pendingTasks.map((task, index) =>
        renderPendingRow(task, completedIds.length === 0 && index === pendingTasks.length - 1),
      )}

      {completedIds.length > 0 && (
        <div className={styles.groupLabel}>
          <Typography.Text className={styles.groupLabelText}>
            {intl.formatMessage({
              id: 'ChecklistToday.completed',
              defaultMessage: 'Completed',
            })}
          </Typography.Text>
          <span className={styles.groupLabelLine} />
        </div>
      )}
      {completedIds.map((id, index) => renderRow(id, index === completedIds.length - 1))}

      <AddInlineTask
        date={date}
        className={styles.addTaskButtonBottom}
        onTaskCreateStart={handleTaskCreateStart}
        onTaskCreateEnd={handleTaskCreateEnd}
      />
    </div>
  );
};

export default ChecklistToday;
