import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import { createTask } from '@pregnant/create-checklist-page-ui/src/createTaskUtil';
import { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
import cx from 'classnames';
import styles from './index.module.scss';

interface AddInlineTaskProps {
  onTaskCreated?: () => void;
  className?: string;
}

const AddInlineTask = ({ 
  onTaskCreated, 
  className 
}: AddInlineTaskProps) => {
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

  const submitTask = () => {
    if (!taskName.trim() || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Create a simple forever task with default values
      const formData: FormState = {
        selectedRecords: [],
        checklistText: taskName.trim(),
        weeklyHobbies: [], // No schedule = forever task
        startedAt: new Date().toISOString().split('T')[0],
        selectedTime: '',
        selectedIcon: 'material-symbols:checklist',
        selectedColor: '#607d8b',
        fieldGroups: [],
        tags: [],
      };

      createTask(formData, addChecklistTemplate, addChecklist);

      // Reset form
      setTaskName('');
      // Force re-render of Input component to clear its internal state
      setInputKey(prev => prev + 1);
      onTaskCreated?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
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
};

export default AddInlineTask;
