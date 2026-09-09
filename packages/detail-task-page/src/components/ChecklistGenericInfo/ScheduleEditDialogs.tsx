import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  FieldGroup,
  useFieldGroups,
  getActiveFieldGroups,
  hasGroupSchedule,
  mergeEditedFieldGroups,
  getClientTimezone,
} from '@dreamer/global';
import Dialog from '@moon-ui/modal/src/Dialog';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import Button from '@moon-ui/button/src/DefaultButton';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';
import { startOfDay } from 'date-fns';
import { calculateRepeat } from '@pregnant/create-checklist-page-ui/src/calculateRepeat';
import {
  repeatToRecurrenceValue,
  recurrenceValueToExtra,
  recurrenceValueToDays,
  type RecurrenceValue,
} from '@pregnant/create-checklist-page-ui/src/SchedulingGroup/recurrenceConfig';
import { GroupScheduleList, ScheduleModalContent } from '@pregnant/create-checklist-page-ui';
import StartEndDateFields from './StartEndDateFields';
import { ScheduleModeChooser, ScheduleModeSwitcher } from './ScheduleModeFields';
import styles from './index.module.scss';

export type ScheduleEditMode = 'schedule' | 'myReminder' | null;

type Props = {
  checklistTemplate: ChecklistTemplate;
  onUpdate: (template: ChecklistTemplate) => void;
  // Same "already a genuine recurring series" split prompt as ChecklistGenericInfo's own —
  // undefined here just means this caller has nothing to split into (see that component's own
  // comment on the exact gate `handleSaveSchedule` below applies).
  onSplitSchedule?: (effectiveFrom: string, newRepeat: NonNullable<ChecklistTemplate['repeat']>) => void;
  readOnly?: boolean;
  onUpdateMyReminder?: (repeat: ChecklistTemplate['repeat'] | null) => void;
  // The specific day's own Checklist instance, when there is one — same prop
  // ChecklistGenericInfo itself takes (see that component's own comment). The Start/End Date
  // fields always seed from — and, on Save, write back to — this row's own `startedAt`/
  // `endedDate`, never the template's `repeat` (see `initialStartDay` below), so
  // `onUpdateChecklist` is required for those fields to be editable at all here.
  checklist?: Checklist;
  onUpdateChecklist?: (patch: Partial<Checklist> & { id: string }) => void;
  // 'schedule' shows the owner's editor, 'myReminder' the participant's own-override editor,
  // null renders nothing (both Dialogs stay mounted with visible=false either way).
  mode: ScheduleEditMode;
  onClose: () => void;
};

// Fallback shape for `repeat` when calculateRepeat itself returns `undefined` — see
// ChecklistGenericInfo's own history on this constant for the full reasoning; unchanged by the
// extraction, just relocated alongside the handlers that use it.
const noScheduleRepeatBase = (allDay: boolean, selectedTime: string) => {
  const [byhour = '', byminute = ''] = allDay || !selectedTime ? ['', ''] : selectedTime.split(':');
  return { byhour, byminute, byday: '', recurring: false };
};

const NOOP_DAYS: Day[] = [];
const NOOP_SET_DAYS = () => {};

// The Schedule (owner) and My Reminder (participant) dialogs used to live inline in
// ChecklistGenericInfo — pulled out so the calendar's own quick-look TaskDetailModal can open the
// exact same editor (same field-group/all-day/split-scope handling) without either duplicating
// this logic or navigating away to the full detail page. `checklistTemplate`/`onUpdate`/
// `onSplitSchedule`/`readOnly`/`onUpdateMyReminder` are the same props ChecklistGenericInfo itself
// takes for the same purpose; `mode`/`onClose` replace what used to be that component's own
// `activeModal`/`setActiveModal(EditModal.None)`.
const ScheduleEditDialogs = ({
  checklistTemplate,
  onUpdate,
  onSplitSchedule,
  readOnly,
  onUpdateMyReminder,
  checklist,
  onUpdateChecklist,
  mode,
  onClose,
}: Props) => {
  const intl = useIntl();
  const { updateFieldGroup, updateMyFieldGroupRepeat } = useFieldGroups();

  const hasFieldGroups = hasGroupSchedule(checklistTemplate);
  const hasActiveFieldGroups = getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).length > 0;
  // Start/End Date always belong to the checklist row, never `checklistTemplate.repeat` — one
  // source, not two copies that can drift apart. `repeat.startedAt` (the recurrence's own DTSTART)
  // is still derived from it on save (see `handleSaveSchedule`'s `finalRepeat.startedAt:
  // tempStartDay` below), but `repeat.until` is never set from this dialog at all any more —
  // avoids the exact bug createTaskUtil.ts's own comment describes (a value there sitting on the
  // template and getting silently reapplied the next time a real weekly pattern is saved).
  const initialStartDay = () => checklist?.startedAt || startOfDay(new Date()).toISOString();
  const initialEndDay = () => checklist?.endedDate ?? '';

  const [tempStartDay, setTempStartDay] = React.useState(initialStartDay);
  const [tempTime, setTempTime] = React.useState(
    checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute
      ? `${checklistTemplate.repeat.byhour.padStart(2, '0')}:${checklistTemplate.repeat.byminute.padStart(2, '0')}`
      : '',
  );
  const [tempEndDay, setTempEndDay] = React.useState(initialEndDay);
  const [tempAllDay, setTempAllDay] = React.useState(
    !(checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute),
  );
  const [tempRecurrence, setTempRecurrence] = React.useState<RecurrenceValue>(
    repeatToRecurrenceValue(checklistTemplate.repeat, true, false),
  );
  const [tempFieldGroups, setTempFieldGroups] = React.useState<FieldGroup[]>(checklistTemplate.fieldGroups);
  const [tempScheduleMode, setTempScheduleMode] = React.useState<'general' | 'per_group' | undefined>(
    checklistTemplate.scheduleMode,
  );
  const [pendingScheduleRepeat, setPendingScheduleRepeat] = React.useState<ChecklistTemplate['repeat'] | null>(null);

  const resetStagedFields = () => {
    setTempStartDay(initialStartDay());
    setTempEndDay(initialEndDay());
    setTempAllDay(!(checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute));
    setTempTime(
      checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute
        ? `${checklistTemplate.repeat.byhour.padStart(2, '0')}:${checklistTemplate.repeat.byminute.padStart(2, '0')}`
        : '',
    );
    setTempRecurrence(repeatToRecurrenceValue(checklistTemplate.repeat, true, false));
    setTempFieldGroups(checklistTemplate.fieldGroups);
    setTempScheduleMode(checklistTemplate.scheduleMode);
  };

  // Re-stages from the live template every time this opens — mirrors ChecklistGenericInfo's own
  // "resetModalStates() right before setActiveModal" (opening used to be one synchronous click
  // handler in the same component); here opening is driven externally via `mode`, so a mount-style
  // effect keyed on it turning non-null is the equivalent moment.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (mode) resetStagedFields();
  }, [mode]);

  const handleStartDateChange = (iso: string) => {
    setTempStartDay(iso);
    if (!tempAllDay) {
      const d = new Date(iso);
      setTempTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  };

  const handleAllDayChange = (checked: boolean) => {
    setTempAllDay(checked);
    if (!checked && !tempTime) {
      setTempTime('08:00');
      const d = new Date(tempStartDay);
      setTempStartDay(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0).toISOString());
    }
  };

  const handleSaveSchedule = () => {
    const repeat = calculateRepeat({
      weeklyHobbies: recurrenceValueToDays(tempRecurrence),
      selectedTime: tempTime,
      startedAt: tempStartDay,
      allDay: tempAllDay,
      ...recurrenceValueToExtra(tempRecurrence),
    });

    const finalRepeat = {
      ...(repeat ?? noScheduleRepeatBase(tempAllDay, tempTime)),
      startedAt: tempStartDay,
      // `tempEndDay` is the checklist's own end date, staged here only for editing (see
      // `initialEndDay` above) and written back to `checklist.endedDate` below — never to
      // `repeat.until` (see `initialStartDay`'s own comment on why).
      until: undefined,
      timezone: getClientTimezone(),
    };

    if (!readOnly) {
      tempFieldGroups.forEach(group => {
        const original = checklistTemplate.fieldGroups.find(g => g.id === group.id);
        if (original && JSON.stringify(group) !== JSON.stringify(original)) {
          updateFieldGroup(group);
        }
      });
    }
    if (checklist) {
      onUpdateChecklist?.({ id: checklist.id, startedAt: tempStartDay, endedDate: tempEndDay || undefined });
    }
    onClose();

    const wasAlreadyRecurring = !!checklistTemplate.repeat?.byday && !hasFieldGroups;
    if (onSplitSchedule && wasAlreadyRecurring) {
      setPendingScheduleRepeat(finalRepeat);
      return;
    }

    onUpdate({ ...checklistTemplate, repeat: finalRepeat, scheduleMode: tempScheduleMode });
  };

  const handleConfirmScheduleScope = (scope: 'thisAndFollowing' | 'all') => {
    if (!pendingScheduleRepeat) return;
    const repeat = pendingScheduleRepeat;
    setPendingScheduleRepeat(null);
    if (scope === 'thisAndFollowing') {
      onSplitSchedule?.(new Date().toISOString(), repeat);
    } else {
      onUpdate({ ...checklistTemplate, repeat, scheduleMode: tempScheduleMode });
    }
  };

  const handleCancelScheduleScope = () => setPendingScheduleRepeat(null);

  const handleSaveMyReminder = () => {
    if (hasFieldGroups) {
      tempFieldGroups.forEach(group => {
        const original = checklistTemplate.fieldGroups.find(g => g.id === group.id);
        if (original && JSON.stringify(group.repeat ?? null) !== JSON.stringify(original.repeat ?? null)) {
          updateMyFieldGroupRepeat(group.id, group.checklistTemplateId, group.repeat ?? null);
        }
      });
      onClose();
      return;
    }

    const repeat = calculateRepeat({
      weeklyHobbies: recurrenceValueToDays(tempRecurrence),
      selectedTime: tempTime,
      startedAt: tempStartDay,
      allDay: tempAllDay,
      ...recurrenceValueToExtra(tempRecurrence),
    });
    onUpdateMyReminder?.({
      ...(repeat ?? noScheduleRepeatBase(tempAllDay, tempTime)),
      startedAt: tempStartDay,
      until: tempEndDay || undefined,
      timezone: getClientTimezone(),
    });
    onClose();
  };

  const handleResetMyReminder = () => {
    if (hasFieldGroups) {
      getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).forEach(group => {
        updateMyFieldGroupRepeat(group.id, group.checklistTemplateId, null);
      });
      onClose();
      return;
    }
    onUpdateMyReminder?.(null);
    onClose();
  };

  const handleModalClose = () => {
    resetStagedFields();
    onClose();
  };

  return (
    <>
      {/* Schedule Edit Modal — owner only */}
      <Dialog
        visible={mode === 'schedule'}
        onDismiss={handleModalClose}
        icon="solar:calendar-date-line-duotone"
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-schedule-title',
          defaultMessage: 'Edit Schedule',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSaveSchedule}
              disabled={hasActiveFieldGroups && !tempScheduleMode}
              className={styles.headerSaveButton}
            >
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
        bodyClassName={styles.noBodyPadding}
      >
        <div className={styles.scheduleDateFields}>
          <StartEndDateFields
            startDate={tempStartDay}
            onStartDateChange={handleStartDateChange}
            endDate={tempEndDay}
            onEndDateChange={setTempEndDay}
            allDay={tempAllDay}
            onAllDayChange={handleAllDayChange}
          />
        </div>
        {hasActiveFieldGroups && !tempScheduleMode ? (
          <ScheduleModeChooser onChoose={setTempScheduleMode} />
        ) : (
          <>
            {hasActiveFieldGroups && (
              <ScheduleModeSwitcher mode={tempScheduleMode ?? 'per_group'} onChange={setTempScheduleMode} />
            )}
            <ScheduleModalContent
              tempWeeklyHobbies={NOOP_DAYS}
              setTempWeeklyHobbies={NOOP_SET_DAYS}
              tempDate={tempStartDay}
              setTempDate={setTempStartDay}
              tempTime={tempTime}
              setTempTime={setTempTime}
              fieldGroups={tempScheduleMode === 'per_group' ? tempFieldGroups : undefined}
              onFieldGroupsChange={tempScheduleMode === 'per_group' ? setTempFieldGroups : undefined}
              hideStartDate
              showRecurrenceControls
              tempRecurrence={tempRecurrence}
              setTempRecurrence={setTempRecurrence}
            />
          </>
        )}
      </Dialog>

      {/* My Reminder Modal — challenge participant's own override */}
      <Dialog
        visible={mode === 'myReminder'}
        onDismiss={handleModalClose}
        icon="solar:bell-bing-line-duotone"
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-my-reminder-title',
          defaultMessage: 'My Reminder',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSaveMyReminder} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
        bodyClassName={hasFieldGroups ? undefined : styles.noBodyPadding}
      >
        {hasFieldGroups ? (
          <GroupScheduleList
            fieldGroups={getActiveFieldGroups(tempFieldGroups)}
            onChange={edited => setTempFieldGroups(mergeEditedFieldGroups(tempFieldGroups, edited))}
          />
        ) : (
          <>
            <div className={styles.myReminderDateFields}>
              <StartEndDateFields
                startDate={tempStartDay}
                onStartDateChange={handleStartDateChange}
                endDate={tempEndDay}
                onEndDateChange={setTempEndDay}
                allDay={tempAllDay}
                onAllDayChange={handleAllDayChange}
                showStartDate={false}
              />
            </div>
            <ScheduleModalContent
              tempWeeklyHobbies={NOOP_DAYS}
              setTempWeeklyHobbies={NOOP_SET_DAYS}
              tempDate={tempStartDay}
              setTempDate={setTempStartDay}
              tempTime={tempTime}
              setTempTime={setTempTime}
              hideStartDate
              showRecurrenceControls
              tempRecurrence={tempRecurrence}
              setTempRecurrence={setTempRecurrence}
            />
          </>
        )}
        {(hasFieldGroups || checklistTemplate.repeat?.isPersonal) && (
          <div className={styles.resetReminderRow}>
            <Button type="ghost" size="sm" onClick={handleResetMyReminder}>
              {intl.formatMessage({
                id: 'checklist-generic-info.reset-my-reminder',
                defaultMessage: 'Reset to group schedule',
              })}
            </Button>
          </div>
        )}
      </Dialog>

      {/* Google-Calendar-style edit-scope prompt — only ever shown by handleSaveSchedule, for an
          already-recurring template (see its own comment on the exact gate). */}
      <WarningModal
        visible={!!pendingScheduleRepeat}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-title',
          defaultMessage: 'Edit recurring task',
        })}
        content={
          <Typography.Text>
            {intl.formatMessage({
              id: 'checklist-generic-info.edit-scope-message',
              defaultMessage: 'This task repeats. Apply this change to:',
            })}
          </Typography.Text>
        }
        secondaryButtonText={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={handleCancelScheduleScope}
        tertiaryButtonText={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-following',
          defaultMessage: 'This and following',
        })}
        tertiaryButtonOnClick={() => handleConfirmScheduleScope('thisAndFollowing')}
        primaryButtonText={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-all',
          defaultMessage: 'All events',
        })}
        primaryButtonOnClick={() => handleConfirmScheduleScope('all')}
      />
    </>
  );
};

export default ScheduleEditDialogs;
