import React from 'react';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import styles from './ChecklistDay.desktop.module.scss';
import AddInlineTask, { AddInlineTaskHandle, PendingInlineTask } from '../AddInlineTask';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';

type Props = {
  date: Date;
  addTaskRef: React.RefObject<AddInlineTaskHandle>;
  onTaskCreateStart: (task: PendingInlineTask) => void;
  onTaskCreateEnd: (id: string) => void;
};

// Shown once the templates/checklists fetch has genuinely resolved with nothing for this day —
// pulled out of ChecklistDay.desktop.tsx to keep that file under the repo's ~200-line-per-file
// guideline (CLAUDE.md's "Keep every file under ~200 lines"). Its own shortcuts hint only lists
// 'a' — nothing else in useChecklistDayShortcuts.ts's j/k/x/o/l/d means anything with no row in
// the list yet, so ChecklistDayShortcutsHint's full version isn't reused here.
const ChecklistDayEmptyState = ({ date, addTaskRef, onTaskCreateStart, onTaskCreateEnd }: Props) => {
  const intl = useIntl();
  return (
    <>
      <div className={styles.emptyContainer}>
        <div className={styles.emptyBody}>
          <EmptyChecklistIllustration />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({ id: 'ChecklistToday.no-record', defaultMessage: 'No tasks found!' })}
          </Typography.Title>
          <Typography.Text className={styles.emptyDescription}>
            Create your first task to get started with your daily routine.
          </Typography.Text>
        </div>
        <AddInlineTask
          ref={addTaskRef}
          date={date}
          className={styles.quickAddTask}
          onTaskCreateStart={onTaskCreateStart}
          onTaskCreateEnd={onTaskCreateEnd}
        />
      </div>
      <div className={styles.shortcutsHint}>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>a</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-add', defaultMessage: 'Add task' })}
        </span>
      </div>
    </>
  );
};

export default ChecklistDayEmptyState;
