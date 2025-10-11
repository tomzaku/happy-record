import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import { createTask } from '@pregnant/create-checklist-page-ui/src/createTaskUtil';
import { FormState } from '@pregnant/create-checklist-page-ui/src/CoreChecklistForm';
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskName.trim() || isSubmitting) return;

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
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      onTaskCreated?.();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`${styles.container} ${className || ''}`}
    >
      <Input
        ref={inputRef}
        type="text"
        value={taskName}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskName(e.target.value)}
        onKeyDown={handleKeyDown}
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
