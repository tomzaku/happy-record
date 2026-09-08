import React from 'react';
import { useChecklist, useChecklistTemplates, uniqueId } from '@dreamer/global';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import Dropdown from '@moon-ui/dropdown';
import { Icon } from '@moon-ui/icon/Icon';
import { createTask } from '@pregnant/create-checklist-page-ui/src/createTaskUtil';
import { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
import { startOfDay } from 'date-fns';
import cx from 'classnames';
import styles from './index.module.scss';

export interface PendingInlineTask {
  id: string;
  title: string;
}

interface AddInlineTaskProps {
  // The day this task should be created against — the homepage's currently
  // viewed date, not necessarily today. Defaults to today so callers that
  // never navigate away from "today" (e.g. index.mobile.tsx's bottom-of-list
  // add row, which doesn't currently thread a date through) keep working.
  date?: Date;
  onTaskCreated?: () => void;
  // Fired synchronously right before the create request goes out, and again
  // once it settles (success or failure) — lets a parent render an
  // optimistic "Creating…" row in its own list for the gap until the real
  // template (and, for a one-off task, its Checklist row — seeded in the
  // same request now, see createTaskUtil.ts's own comment) lands locally.
  onTaskCreateStart?: (task: PendingInlineTask) => void;
  onTaskCreateEnd?: (id: string) => void;
  className?: string;
}

export interface AddInlineTaskHandle {
  focus: () => void;
}

const AddInlineTask = React.forwardRef<AddInlineTaskHandle, AddInlineTaskProps>(({
  date,
  onTaskCreated,
  onTaskCreateStart,
  onTaskCreateEnd,
  className
}, ref) => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const [taskName, setTaskName] = React.useState('');
  // Just the two options for now — "Single day" (false, the default) or "No end date" (true),
  // picked from the Dropdown next to Submit below.
  const [noEndDate, setNoEndDate] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [inputKey, setInputKey] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // A ref, not just `isSubmitting` state: two calls in the same tick (Enter's
  // native form submission racing this same handler, or a hurried
  // double-click) both read `isSubmitting` before either call's own
  // `setIsSubmitting(true)` has re-rendered — a ref is checked/set
  // synchronously, so the second call actually sees the first one's guard.
  const isSubmittingRef = React.useRef(false);

  React.useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const submitTask = () => {
    if (!taskName.trim() || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const title = taskName.trim();
    const pendingId = uniqueId();
    onTaskCreateStart?.({ id: pendingId, title });

    const noEndDateAtSubmit = noEndDate;

    // Reset the form right away — the pending row above stands in for this
    // task while it saves in the background, so there's no reason to make
    // the user wait before typing the next one.
    setTaskName('');
    setNoEndDate(false);
    // Force re-render of Input component to clear its internal state
    setInputKey(prev => prev + 1);
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    // Create a simple one-off task with default values
    const formData: FormState = {
      selectedRecords: [],
      checklistText: title,
      weeklyHobbies: [], // No schedule = one-off task
      // `startOfDay` truncates in *local* time, not `.toISOString().split('T')[0]`'s UTC — that
      // silently rolls back to the previous day for anyone east of UTC (a local midnight like
      // 2026-08-20T00:00 in UTC+7 is 2026-08-19T17:00Z, so the UTC date is still the 19th).
      startedAt: startOfDay(date ?? new Date()).toISOString(),
      selectedTime: '',
      selectedIcon: 'material-symbols:checklist',
      selectedColor: '#607d8b',
      fieldGroups: [],
      tags: [],
      noEndDate: noEndDateAtSubmit,
    };

    createTask(formData, addChecklistTemplate, addChecklist)
      .then(() => onTaskCreated?.())
      .catch(error => {
        console.error('Failed to create task:', error);
      })
      .finally(() => {
        onTaskCreateEnd?.(pendingId);
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTask();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cx(styles.container, className)}
    >
      <Input
        key={inputKey}
        ref={inputRef}
        type="text"
        value={taskName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskName(e.target.value)}
        placeholder="Add a new task..."
        classes={{wrapper: styles.inputWrapper, input: styles.input, placeholder: styles.placeholder}}
        disabled={isSubmitting}
        border="dash"
        renderRightInput={() => {
          if (taskName.trim()) {
            return (
              <div className={styles.rightControls}>
                <Dropdown
                  trigger={
                    <span className={styles.endDateTriggerLabel}>
                      <Icon width={14} icon="solar:calendar-mark-line-duotone" />
                      {noEndDate ? 'No end date' : 'Single day'}
                    </span>
                  }
                  triggerClassName={styles.endDateTrigger}
                  triggerAriaLabel="Choose end date"
                  items={[
                    // "Single day" not "Ends today" — `date` is whatever day the user is
                    // currently viewing (the home calendar's selected day), not necessarily
                    // today, so a fixed "today" label would misdescribe a task added for another
                    // day.
                    { key: 'end-of-day', label: 'Single day', onClick: () => setNoEndDate(false) },
                    { key: 'no-end-date', label: 'No end date', onClick: () => setNoEndDate(true) },
                  ]}
                />
                <Button
                  type="primary"
                  size="sm"
                  onClick={submitTask}
                  disabled={isSubmitting}
                  className={styles.submitButton}
                  aria-label="Add task"
                >
                  Submit
                </Button>
              </div>
            );
          }
          return <></>;
        }}
        renderLeftInput={() => <></>}
      />
    </form>
  );
});

AddInlineTask.displayName = 'AddInlineTask';

export default AddInlineTask;
