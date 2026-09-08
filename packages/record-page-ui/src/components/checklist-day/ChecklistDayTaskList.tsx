import React from 'react';
import { AnimatePresence } from 'framer-motion';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
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
              <Typography.Text className={styles.sectionCount}>
                {pendingIds.length + pendingTasks.length}
              </Typography.Text>
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
            <Typography.Text className={styles.sectionCount}>{completedIds.length}</Typography.Text>
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
