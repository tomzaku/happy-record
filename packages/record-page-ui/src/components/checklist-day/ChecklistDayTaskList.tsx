import React from 'react';
import { AnimatePresence } from 'framer-motion';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';
import AddInlineTask, { AddInlineTaskHandle, PendingInlineTask } from '../AddInlineTask';
import PendingTaskRow from './PendingTaskRow';

type Props = {
  date: Date;
  pendingIds: string[];
  completedIds: string[];
  pendingTasks: PendingInlineTask[];
  renderTaskRow: (id: string) => React.ReactNode;
  addTaskRef: React.RefObject<AddInlineTaskHandle>;
  onTaskCreateStart: (task: PendingInlineTask) => void;
  onTaskCreateEnd: (id: string) => void;
  // Which ids in each section actually have a field-group area to expand/collapse — a section
  // with none of these gets no "expand/collapse all" button at all, same as a single row with no
  // field groups gets no expand button of its own (see ChecklistDayRow).
  pendingExpandableIds: string[];
  completedExpandableIds: string[];
  isSectionExpanded: (ids: string[]) => boolean;
  onToggleSectionExpanded: (ids: string[]) => void;
};

const SectionExpandButton = ({
  expandableIds,
  isSectionExpanded,
  onToggleSectionExpanded,
}: {
  expandableIds: string[];
  isSectionExpanded: (ids: string[]) => boolean;
  onToggleSectionExpanded: (ids: string[]) => void;
}) => {
  const intl = useIntl();
  if (expandableIds.length === 0) return null;

  const expanded = isSectionExpanded(expandableIds);
  return (
    <button
      type="button"
      className={styles.rowExpandButton}
      onClick={() => onToggleSectionExpanded(expandableIds)}
      aria-label={
        expanded
          ? intl.formatMessage({ id: 'ChecklistToday.collapse-all-tasks', defaultMessage: 'Collapse all' })
          : intl.formatMessage({ id: 'ChecklistToday.expand-all-tasks', defaultMessage: 'Expand all' })
      }
    >
      <Icon
        width={16}
        icon="solar:alt-arrow-down-linear"
        className={cx(styles.rowExpandIcon, expanded && styles.rowExpandIconOpen)}
      />
    </button>
  );
};

// The full-list branch's own two sections (Pending, Completed) plus the inline "Add a task" row —
// pulled out of ChecklistDay.desktop.tsx to keep that file under the repo's ~200-line-per-file
// guideline (CLAUDE.md's "Keep every file under ~200 lines").
const ChecklistDayTaskList = ({
  date,
  pendingIds,
  completedIds,
  pendingTasks,
  renderTaskRow,
  addTaskRef,
  onTaskCreateStart,
  onTaskCreateEnd,
  pendingExpandableIds,
  completedExpandableIds,
  isSectionExpanded,
  onToggleSectionExpanded,
}: Props) => {
  const intl = useIntl();
  return (
    <>
      <Card className={styles.sectionCard}>
        {(pendingIds.length > 0 || pendingTasks.length > 0) && (
          <>
            <div className={styles.sectionHeader}>
              <Typography.Text className={styles.sectionLabel}>
                {intl.formatMessage({ id: 'ChecklistToday.pending', defaultMessage: 'Pending' })}
              </Typography.Text>
              <div className={styles.sectionHeaderRight}>
                <Typography.Text className={styles.sectionCount}>
                  {pendingIds.length + pendingTasks.length}
                </Typography.Text>
                <SectionExpandButton
                  expandableIds={pendingExpandableIds}
                  isSectionExpanded={isSectionExpanded}
                  onToggleSectionExpanded={onToggleSectionExpanded}
                />
              </div>
            </div>
            <div className={styles.itemList}>
              {/* `pendingTasks` (the transient "Creating…" placeholder) stays outside this
                  `AnimatePresence` on purpose — it's a plain, untracked element (see
                  PendingTaskRow's own comment), and mixing an untracked child in with the
                  `motion.div` rows `AnimatePresence` *is* tracking confuses its own bookkeeping of
                  which index each exiting row should reappear at. */}
              <AnimatePresence initial={false}>{pendingIds.map(renderTaskRow)}</AnimatePresence>
              {pendingTasks.map(task => (
                <PendingTaskRow key={task.id} task={task} />
              ))}
            </div>
          </>
        )}
        <AddInlineTask
          ref={addTaskRef}
          date={date}
          className={styles.quickAddTask}
          onTaskCreateStart={onTaskCreateStart}
          onTaskCreateEnd={onTaskCreateEnd}
        />
      </Card>

      {completedIds.length > 0 && (
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionLabel}>
              {intl.formatMessage({ id: 'ChecklistToday.completed', defaultMessage: 'Completed' })}
            </Typography.Text>
            <div className={styles.sectionHeaderRight}>
              <Typography.Text className={styles.sectionCount}>{completedIds.length}</Typography.Text>
              <SectionExpandButton
                expandableIds={completedExpandableIds}
                isSectionExpanded={isSectionExpanded}
                onToggleSectionExpanded={onToggleSectionExpanded}
              />
            </div>
          </div>
          <div className={styles.itemList}>
            <AnimatePresence initial={false}>{completedIds.map(renderTaskRow)}</AnimatePresence>
          </div>
        </Card>
      )}
    </>
  );
};

export default ChecklistDayTaskList;
