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
import { formatTemplateSchedule, getScheduledTimeLabel, getHasQuickSubmit } from './checklistDayHelpers';
import ChecklistDayRowSubmit from './ChecklistDayRowSubmit';
import ChecklistDayRowTitle from './ChecklistDayRowTitle';

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
  // Lifted up to ChecklistDay.desktop.tsx so a section header's "expand/collapse all" button can
  // drive every row's own field-group area at once, not just this row's own toggle.
  expanded: boolean;
  onToggleExpanded: () => void;
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
  expanded,
  onToggleExpanded,
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

  // Whether this row has anything to expand into — a field-group task with at least one group
  // actually due on `date` (a multi-group template's other groups, scheduled on other days,
  // don't count — see isFieldGroupActiveOnDay's own doc comment). A plain check/uncheck task has
  // nothing more to show than the checkbox already in the row header, so it gets no expand button
  // at all rather than an expand area that would always render empty.
  const hasQuickSubmit = getHasQuickSubmit(currentChecklistTemplate, date);

  return (
    <div className={styles.taskRowContainer}>
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
        <div className={styles.rowIconBadge} style={{ backgroundColor: `${color}1f` }}>
          <Icon
            className={styles.rowIcon}
            width={18}
            height={18}
            color={color}
            icon={currentChecklistTemplate?.avatar.name || 'solar:settings-linear'}
          />
        </div>
        <div className={styles.rowInfo}>
          <div className={styles.rowTitleLine}>
            <ChecklistDayRowTitle
              id={id}
              title={title}
              isEditingTitle={isEditingTitle}
              editingTitleValue={editingTitleValue}
              setEditingTitleValue={setEditingTitleValue}
              startEditingTitle={startEditingTitle}
              commitEditingTitle={commitEditingTitle}
              cancelEditingTitle={cancelEditingTitle}
              openDelete={openDelete}
            />
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
              icon="lucide:goal"
              title={intl.formatMessage({ id: 'ChecklistToday.challenge-badge', defaultMessage: 'Challenge' })}
            />
          )}
          {timeLabel && <Typography.Text className={styles.rowTime}>{timeLabel}</Typography.Text>}
          {hasQuickSubmit && (
            <button
              type="button"
              className={styles.rowExpandButton}
              onClick={event => {
                event.stopPropagation();
                onToggleExpanded();
              }}
              aria-label={
                expanded
                  ? intl.formatMessage({ id: 'ChecklistToday.collapse-task', defaultMessage: 'Collapse' })
                  : intl.formatMessage({ id: 'ChecklistToday.expand-task', defaultMessage: 'Expand' })
              }
            >
              <Icon
                width={16}
                icon="solar:alt-arrow-down-linear"
                className={cx(styles.rowExpandIcon, expanded && styles.rowExpandIconOpen)}
              />
            </button>
          )}
        </div>
      </motion.div>
      {hasQuickSubmit && expanded && (
        <ChecklistDayRowSubmit checklistTemplateId={currentChecklist.checklistTemplateId} date={date} />
      )}
    </div>
  );
};

export default ChecklistDayRow;
