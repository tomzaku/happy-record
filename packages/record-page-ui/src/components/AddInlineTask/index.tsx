import React from 'react';
import { useChecklist, useChecklistTemplates, uniqueId } from '@dreamer/global';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import { createTask } from '@pregnant/create-checklist-page-ui/src/createTaskUtil';
import { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
import cx from 'classnames';
import styles from './index.module.scss';

export interface PendingInlineTask {
  id: string;
  title: string;
}

interface AddInlineTaskProps {
  onTaskCreated?: () => void;
  // Fired synchronously right before the create request goes out, and again
  // once it settles (success or failure) — lets a parent render an
  // optimistic "Creating…" row in its own list for the gap between "user hit
  // submit" and "the real Checklist row exists in the store" (createTaskUtil
  // has to await the template's own POST before it can create the checklist
  // instance, to avoid racing checklist_template_id's FK — see its comment).
  onTaskCreateStart?: (task: PendingInlineTask) => void;
  onTaskCreateEnd?: (id: string) => void;
  className?: string;
}

export interface AddInlineTaskHandle {
  focus: () => void;
}

const AddInlineTask = React.forwardRef<AddInlineTaskHandle, AddInlineTaskProps>(({
  onTaskCreated,
  onTaskCreateStart,
  onTaskCreateEnd,
  className
}, ref) => {
  const { addChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const [taskName, setTaskName] = React.useState('');
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

    // Reset the form right away — the pending row above stands in for this
    // task while it saves in the background, so there's no reason to make
    // the user wait before typing the next one.
    setTaskName('');
    // Force re-render of Input component to clear its internal state
    setInputKey(prev => prev + 1);
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    // Create a simple forever task with default values
    const formData: FormState = {
      selectedRecords: [],
      checklistText: title,
      weeklyHobbies: [], // No schedule = forever task
      startedAt: new Date().toISOString().split('T')[0],
      selectedTime: '',
      selectedIcon: 'material-symbols:checklist',
      selectedColor: '#607d8b',
      fieldGroups: [],
      tags: [],
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
