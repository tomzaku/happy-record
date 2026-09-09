import React from 'react';
import Button from '@moon-ui/button';
import { Icon } from '@moon-ui/icon/Icon';
import TextareaAutosize from 'react-textarea-autosize';
import SchedulingGroup from './SchedulingGroup';
import { Day } from '@dreamer/tasks-page-common';
import IconPicker from './IconPicker';
import Hr from './hr';
// The real (global) FieldGroup shape, not RecordTaskSetting's own local copy — that component
// is dead code today (see the commented-out render below); SchedulingGroup is what actually
// builds/edits `fieldGroups` in this form, and it's always used the global type.
import { FieldGroup } from '@dreamer/global';
import TagInput from './TagInput';
import cx from 'classnames';

// Hooks
import { useIntl } from '@dreamer/translation';

import styles from './index.module.scss';

export type FormState = {
  selectedRecords?: string[];
  checklistText: string;
  weeklyHobbies: Day[];
  startedAt: string;
  selectedTime: string;
  selectedIcon: string;
  selectedColor: string;
  fieldGroups?: FieldGroup[];
  tags: string[];
  /** Only consulted for a one-off (non-recurring) task — see createTaskUtil.ts, which writes this
   * to the one-off `Checklist` row's own `endedDate`, never to the template's `repeat` (see
   * that file's own comment on why — `repeat.until`/`count` belong to ChecklistGenericInfo's
   * Schedule dialog and would otherwise leak a stale cutoff into a schedule added later). A real
   * three-way signal: `false` means "single day" (runs for exactly 1 day
   * from `startedAt`, whatever day that is — not necessarily today); `true` or `undefined` (every caller that
   * doesn't offer this choice yet) means no defined end. */
  noEndDate?: boolean;
};
const CoreChecklistForm = ({
  initialValues,
  onSubmit,
  onClickDeleteButton,
  classes,
}: {
  initialValues: FormState;
  onSubmit: (form: FormState) => void | Promise<void>;
  onClickDeleteButton?: () => void;
  classes?: {
    container?: string;
    footer?: string;
    footerCenter?: string;
    submitButton?: string;
    deleteButton?: string;
  };
}) => {
  const [form, setForm] = React.useState<FormState>(initialValues);
  // Checked/set synchronously (not state) so a hurried double-click — this
  // button has no native form to dedupe the submit event for it — can't
  // fire `onSubmit` twice before the first click's own render lands.
  const isSubmittingRef = React.useRef(false);
  // Drives the Submit button's own "Creating…" state below — a caller whose
  // `onSubmit` navigates away right after (CreateChecklistForm.tsx) now
  // awaits it first specifically so this has a real frame to show on.
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const {
    checklistText,
    weeklyHobbies,
    startedAt,
    selectedTime,
    selectedIcon,
    selectedColor,
    fieldGroups, // Used in form submission
    tags,
  } = form;

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

  const setFieldGroups = (groups: FieldGroup[]) => {
    setForm(prevForm => ({ ...prevForm, fieldGroups: groups }));
  };

  const setTags = (tags: string[]) => {
    setForm(prevForm => ({ ...prevForm, tags }));
  };


  const intl = useIntl();

  return (
    <div className={cx(styles.container, classes?.container)}>
      <div className={cx(styles.container, classes?.container)}>
        <TextareaAutosize
          placeholder={intl.formatMessage({
            id: 'CreateChecklist.label-create-checklist-input-placeholder',
            defaultMessage: 'Write your task here',
          })}
          className={styles.input}
          minRows={2}
          maxRows={4}
          autoFocus
          onChange={e => {
            setChecklistText(e.currentTarget.value);
          }}
          value={checklistText}
        />
        <SchedulingGroup
          weeklyHobbies={weeklyHobbies}
          setWeeklyHobbies={setWeeklyHobbies}
          date={startedAt}
          setDate={setStartedAt}
          time={selectedTime}
          setTime={setSelectedTime}
          fieldGroups={fieldGroups}
          onFieldGroupsChange={setFieldGroups}
        />
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
        {/* <RecordTaskSetting */}
        {/*   selectedRecords={selectedRecords} */}
        {/*   setSelectedRecords={setSelectedRecords} */}
        {/*   fieldGroups={fieldGroups} */}
        {/*   setFieldGroups={setFieldGroups} */}
        {/* /> */}
      </div>
      <div className={cx(styles.footer, classes?.footer)}>
        <div className={cx(styles.footerCenter, classes?.footerCenter)}>
          {onClickDeleteButton && (
            <Button
              onClick={onClickDeleteButton}
              className={cx(styles.deleteButton, classes?.deleteButton)}
            >
              {intl.formatMessage({
                id: 'CreateChecklist.label-delete',
                defaultMessage: 'DELETE',
              })}
            </Button>
          )}
          <Button
            type="primary"
            disabled={isSubmitting}
            className={cx(styles.submitButton, classes?.submitButton)}
            onClick={async () => {
              if (isSubmittingRef.current) return;
              isSubmittingRef.current = true;
              setIsSubmitting(true);
              const validGroups = fieldGroups.filter(
                group => group.fields.length > 0,
              );
              try {
                await onSubmit({
                  ...form,
                  fieldGroups: validGroups,
                });
              } finally {
                isSubmittingRef.current = false;
                setIsSubmitting(false);
              }
            }}
          >
            {isSubmitting ? (
              <span className={styles.submitButtonContent}>
                <Icon width={16} icon="svg-spinners:180-ring" />
                {intl.formatMessage({
                  id: 'CreateChecklist.label-submitting',
                  defaultMessage: 'Creating…',
                })}
              </span>
            ) : (
              intl.formatMessage({
                id: 'CreateChecklist.label-submit',
                defaultMessage: 'SUBMIT',
              })
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoreChecklistForm;
