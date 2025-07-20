import React from 'react';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import StartDaySelector from './StartDaySelector';
import TimeSelector from './TimeSelector';
import BuildWeeklyHobby from './BuildWeeklyHobby';
import { Day } from '@dreamer/tasks-page-common';
import IconPicker from './IconPicker';
import Hr from './hr';
import RecordTaskSetting, { FieldGroup } from './RecordTaskSetting';
import TagInput from './TagInput';

// Hooks
import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';

export type FormState = {
  selectedRecords: string[];
  checklistText: string;
  weeklyHobbies: Day[];
  startedAt: string;
  selectedTime: string;
  selectedIcon: string;
  selectedColor: string;
  fieldGroups: FieldGroup[];
  tags: string[];
};
const CoreChecklistForm = ({
  initialValues,
  onSubmit,
  onClickDeleteButton,
}: {
  initialValues: FormState;
  onSubmit: (form: FormState) => void;
  onClickDeleteButton?: () => void;
}) => {
  const [form, setForm] = React.useState<FormState>(initialValues);
  const {
    selectedRecords,
    checklistText,
    weeklyHobbies,
    startedAt,
    selectedTime,
    selectedIcon,
    selectedColor,
    fieldGroups,
    tags,
  } = form;

  // Utility functions for updating form fields
  const setSelectedRecords = (records: string[]) => {
    setForm(prevForm => ({ ...prevForm, selectedRecords: records }));
  };

  const setChecklistText = (text: string) => {
    setForm(prevForm => ({ ...prevForm, checklistText: text }));
  };

  const setWeeklyHobbies = (hobbies: Day[]) => {
    setForm(prevForm => ({ ...prevForm, weeklyHobbies: hobbies }));
  };

  const setStartedAt = (date: string) => {
    setForm(prevForm => ({ ...prevForm, startedAt: date }));
  };

  const setSelectedTime = (time: string) => {
    setForm(prevForm => ({ ...prevForm, selectedTime: time }));
  };

  const setSelectedIcon = (icon: string) => {
    setForm(prevForm => ({ ...prevForm, selectedIcon: icon }));
  };

  const setSelectedColor = (color: string) => {
    setForm(prevForm => ({ ...prevForm, selectedColor: color }));
  };

  const setFieldGroups = (fieldGroups: FieldGroup[]) => {
    setForm(prevForm => ({ ...prevForm, fieldGroups }));
  };

  const setTags = (tags: string[]) => {
    setForm(prevForm => ({ ...prevForm, tags }));
  };

  const intl = useIntl();

  return (
    <div className={styles.container}>
      <div className={styles.container}>
        <TextareaAutosize
          placeholder={intl.formatMessage({
            id: 'CreateChecklist.label-create-checklist-input-placeholder',
            defaultMessage: 'Write your task here',
          })}
          className={styles.input}
          maxRows={3}
          autoFocus
          onChange={e => {
            setChecklistText(e.currentTarget.value);
          }}
          value={checklistText}
        />
        <BuildWeeklyHobby values={weeklyHobbies} setValues={setWeeklyHobbies} />
        <Hr />

        <TagInput tags={tags} setTags={setTags} />
        <Hr />

        <IconPicker
          selectedIcon={selectedIcon}
          setSelectedIcon={setSelectedIcon}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
        />
        <Hr />
        <StartDaySelector date={startedAt} setDate={setStartedAt} />
        <Hr />
        <TimeSelector time={selectedTime} setTime={setSelectedTime} />
        <Hr />
        <RecordTaskSetting
          selectedRecords={selectedRecords}
          setSelectedRecords={setSelectedRecords}
          fieldGroups={fieldGroups}
          setFieldGroups={setFieldGroups}
        />
      </div>
      <div className={styles.footer}>
        <div className={styles.footerCenter}>
          {onClickDeleteButton && (
            <Button
              onClick={onClickDeleteButton}
              className={styles.deleteButton}
            >
              {intl.formatMessage({
                id: 'CreateChecklist.label-delete',
                defaultMessage: 'DELETE',
              })}
            </Button>
          )}
          <Button
            type="primary"
            className={styles.submitButton}
            onClick={() => {
              const validGroups = fieldGroups.filter(
                group => group.fields.length > 0,
              );
              onSubmit({
                ...form,
                fieldGroups: validGroups,
              });
            }}
          >
            {intl.formatMessage({
              id: 'CreateChecklist.label-submit',
              defaultMessage: 'SUBMIT',
            })}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoreChecklistForm;
