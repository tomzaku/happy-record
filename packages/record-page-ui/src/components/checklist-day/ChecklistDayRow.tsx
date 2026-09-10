import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import { motion } from 'framer-motion';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { NavigateFunction } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import { format } from 'date-fns';
import styles from './ChecklistDay.desktop.module.scss';
import { formatTemplateSchedule, getScheduledTimeLabel } from './checklistDayHelpers';

type Props = {
  id: string;
  date: Date;
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  focusedTaskId: string | null;
  hoveredTaskId: string | null;
  setFocusedTaskId: (id: string | null) => void;
  setHoveredTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  updateChecklist: ReturnType<typeof useChecklist>['updateChecklist'];
  navigate: NavigateFunction;
  editingTaskId: string | null;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  startEditingTitle: (taskId: string, currentTitle: string) => void;
  commitEditingTitle: () => void;
  cancelEditingTitle: () => void;
  openDelete: (id: string) => void;
};

// One row of ChecklistDay.desktop.tsx's task list — pulled into its own file to keep that
// component under the repo's ~200-line-per-file guideline (CLAUDE.md's "Keep every file under
// ~200 lines").
const ChecklistDayRow = ({
  id,
  date,
  checklist,
  checklistTemplate,
  focusedTaskId,
  hoveredTaskId,
  setFocusedTaskId,
  setHoveredTaskId,
  updateChecklist,
  navigate,
  editingTaskId,
  editingTitleValue,
  setEditingTitleValue,
  startEditingTitle,
  commitEditingTitle,
  cancelEditingTitle,
  openDelete,
}: Props) => {
  const intl = useIntl();
  const currentChecklist = checklist[id];
  const currentChecklistTemplate = checklistTemplate[currentChecklist.checklistTemplateId];
  const completed = Boolean(currentChecklist?.completedAt);
  const color = currentChecklistTemplate?.avatar.color || '#8A8A8A';
  const timeLabel = completed
    ? currentChecklist.completedAt && format(new Date(currentChecklist.completedAt), 'h:mm')
    : getScheduledTimeLabel(currentChecklistTemplate);
  const title = currentChecklist?.title || currentChecklistTemplate?.title || '';
  const isEditingTitle = editingTaskId === id;
  // Set only on the local optimistic copy (addChecklistTemplate) until the real row lands —
  // see checklistTemplateTypes.ts's own `isClient`. The row already renders (the optimistic
  // write already made it real enough to show), so this only swaps its checkbox/subtitle for a
  // "Creating…" status rather than hiding it.
  const isCreating = Boolean(currentChecklistTemplate?.isClient);

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cx(
        styles.taskRow,
        completed && styles.taskRowDone,
        id === focusedTaskId && styles.taskRowFocused,
        isCreating && styles.taskRowPending,
      )}
      onClick={() => {
        if (isCreating) return;
        setFocusedTaskId(id);
        navigate(
          `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
        );
      }}
      onMouseEnter={() => setHoveredTaskId(id)}
      onMouseLeave={() => setHoveredTaskId(current => (current === id ? null : current))}
    >
      {id === hoveredTaskId && (
        <motion.div
          className={styles.taskHoverBg}
          layoutId="taskHoverBg"
          transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
        />
      )}
      <div onClick={e => e.stopPropagation()} className={styles.rowCheckbox}>
        {isCreating ? (
          <Icon width={20} icon="svg-spinners:180-ring" />
        ) : (
          <Checkbox
            defaultChecked={completed}
            className={styles.checkbox}
            style={{ accentColor: color }}
            onChange={event => {
              event.stopPropagation();
              updateChecklist({
                ...currentChecklist,
                completedAt: event.target.checked ? new Date().toISOString() : undefined,
              });
            }}
          />
        )}
      </div>
      <Icon
        className={styles.rowIcon}
        width={20}
        height={20}
        color={color}
        icon={currentChecklistTemplate?.avatar.name || 'solar:settings-linear'}
      />
      <div className={styles.rowInfo}>
        <div className={styles.rowTitleLine}>
          {isEditingTitle ? (
            <input
              autoFocus
              className={styles.rowTitleInput}
              value={editingTitleValue}
              onClick={event => event.stopPropagation()}
              onChange={event => setEditingTitleValue(event.target.value)}
              onBlur={commitEditingTitle}
              onKeyDown={event => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitEditingTitle();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  cancelEditingTitle();
                }
              }}
            />
          ) : (
            <>
              <Typography.Text className={styles.rowTitle}>{title}</Typography.Text>
              <button
                type="button"
                className={styles.rowEditButton}
                onClick={event => {
                  event.stopPropagation();
                  startEditingTitle(id, title);
                }}
                aria-label={intl.formatMessage({ id: 'ChecklistToday.edit-title', defaultMessage: 'Edit title' })}
              >
                <Icon width={14} icon="solar:pen-2-line-duotone" />
              </button>
              <button
                type="button"
                className={styles.rowDeleteButton}
                onClick={event => {
                  event.stopPropagation();
                  openDelete(id);
                }}
                aria-label={intl.formatMessage({
                  id: 'ChecklistToday.delete-task-label',
                  defaultMessage: 'Delete task',
                })}
              >
                <Icon width={14} icon="solar:trash-bin-minimalistic-2-line-duotone" />
              </button>
            </>
          )}
        </div>
        <Typography.Text className={styles.rowSubtitle}>
          {isCreating
            ? intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })
            : formatTemplateSchedule(currentChecklistTemplate)}
        </Typography.Text>
      </div>
      <div className={styles.rowEnd}>
        {currentChecklistTemplate?.visibility === 'public' && (
          <Icon
            className={styles.challengeBadge}
            width={16}
            height={16}
            icon="solar:cup-star-bold-duotone"
            title={intl.formatMessage({ id: 'ChecklistToday.challenge-badge', defaultMessage: 'Challenge' })}
          />
        )}
        {timeLabel && <Typography.Text className={styles.rowTime}>{timeLabel}</Typography.Text>}
      </div>
    </motion.div>
  );
};

export default ChecklistDayRow;
