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
import Radio from '@moon-ui/radio';
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

// The edit-scope prompt's own three choices — see DeleteTaskModal.tsx's own identically-shaped
// `Scope`, whose doc comment already called this out as the "future fourth option" this fills in.
type ScheduleScope = 'thisEvent' | 'thisAndFollowing' | 'all';

type Props = {
  checklistTemplate: ChecklistTemplate;
  onUpdate: (template: ChecklistTemplate) => void;
  // Same "already a genuine recurring series" split prompt as ChecklistGenericInfo's own —
  // undefined here just means this caller has nothing to split into (see that component's own
  // comment on the exact gate `handleSaveSchedule` below applies).
  onSplitSchedule?: (effectiveFrom: string, newRepeat: NonNullable<ChecklistTemplate['repeat']>) => void;
  // The edit-scope prompt's third, least-drastic option — "This event," alongside "This and
  // following"/"All events" (see handleConfirmScheduleScope below). Undefined means there's
  // nothing to scope a single-occurrence edit to (a non-owner, or a caller with no
  // `modifyOccurrence` wired up yet), same "omit the affordance rather than let it silently no-op"
  // gate `onSplitSchedule` itself already follows. `occurrenceStartedAt` is the occurrence's own
  // exact, unmodified moment (`checklist.startedAt`) — not just its calendar day, since a plain
  // day can't tell two same-day occurrences of a schedule apart (see the `schedule_exceptions`
  // table's own migration); `overrideStartedAt` is the new moment.
  onModifyOccurrence?: (occurrenceStartedAt: string, overrideStartedAt: string) => void;
  readOnly?: boolean;
  onUpdateMyReminder?: (repeat: ChecklistTemplate['repeat'] | null) => void;
  // The specific day's own Checklist instance, when there is one — same prop
  // ChecklistGenericInfo itself takes (see that component's own comment). Its own `startedAt`/
  // `endedDate` are always what the Start/End Date fields display (see `initialStartDay` below),
  // and, for a one-off task specifically (`isOneOffTask` below), what an edit writes back to too —
  // `onUpdateChecklist` is required for that shape to be editable at all here.
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
  onModifyOccurrence,
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
  // A one-off task (`repeat.recurring === false`, no field groups) has no real series — its own
  // Start/End Date live on its one real Checklist instance instead, never `repeat` at all (`until`
  // is deliberately never set on `repeat` for this shape — see createTaskUtil.ts's own comment on
  // why: a value there would still be sitting on the template the next time this same dialog saves
  // a real recurring pattern, silently capping it). See `handleSaveSchedule` below for the
  // write-back half of this — an edited End Date goes to `checklist.endedDate`, never `repeat`.
  const isOneOffTask = checklistTemplate.repeat?.recurring === false && !hasFieldGroups;
  // Both fields always *read* from the checklist row currently being viewed — not
  // `checklistTemplate.repeat.startedAt` — even for a repeating template: opening this dialog
  // from a specific occurrence (e.g. a Sunday three weeks into a WE/FR/SU series) should show
  // *that day*, not the series' own original DTSTART, which nothing about the day being viewed
  // has any relationship to. `isOneOffTask` still decides *where an edit gets written* below
  // (`handleSaveSchedule`) — a one-off task's own end lives on the checklist row, a repeating
  // template's own occurrence length (`End - Start`) becomes `repeat.durationMs`, consulted by
  // every future occurrence via `resolveOccurrenceEnd` (supabase/shared/schedules.ts) — but the
  // *displayed* value is always this row's own real dates either way.
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
    // `respectUntil: true` — the Ends section (showOnDateEnd, ScheduleModalContent.tsx) is real
    // again now that Start/End Date no longer double as the series' own "ends on" field, so this
    // needs to actually seed from a real `until`/`count` instead of always reading "never".
    repeatToRecurrenceValue(checklistTemplate.repeat, true, true),
  );
  const [tempFieldGroups, setTempFieldGroups] = React.useState<FieldGroup[]>(checklistTemplate.fieldGroups);
  const [tempScheduleMode, setTempScheduleMode] = React.useState<'general' | 'per_group' | undefined>(
    checklistTemplate.scheduleMode,
  );
  const [pendingScheduleRepeat, setPendingScheduleRepeat] = React.useState<ChecklistTemplate['repeat'] | null>(null);
  const [scheduleScope, setScheduleScope] = React.useState<ScheduleScope>('thisAndFollowing');

  const resetStagedFields = () => {
    setTempStartDay(initialStartDay());
    setTempEndDay(initialEndDay());
    setTempAllDay(!(checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute));
    setTempTime(
      checklistTemplate.repeat?.byhour && checklistTemplate.repeat?.byminute
        ? `${checklistTemplate.repeat.byhour.padStart(2, '0')}:${checklistTemplate.repeat.byminute.padStart(2, '0')}`
        : '',
    );
    setTempRecurrence(repeatToRecurrenceValue(checklistTemplate.repeat, true, true));
    setTempFieldGroups(checklistTemplate.fieldGroups);
    setTempScheduleMode(checklistTemplate.scheduleMode);
  };

  // Re-stages from the live template every time this opens — mirrors ChecklistGenericInfo's own
  // "resetModalStates() right before setActiveModal" (opening used to be one synchronous click
  // handler in the same component); here opening is driven externally via `mode`, so a mount-style
  // effect keyed on it turning non-null is the equivalent moment. `checklist?.id` is also in the
  // deps — not for exhaustiveness, deliberately: this page's own "General Settings" (and this
  // dialog's own pencil icon with it) is clickable as soon as the *template* loads, before the
  // day's own `checklist` row necessarily has (see index.desktop.tsx's own `isTemplateReady`-only
  // gate) — opening this dialog in that window staged a one-off task's Start/End Date from
  // `initialStartDay`'s own `checklist?.startedAt || startOfDay(new Date())` fallback, silently
  // landing on *today* instead of the task's real date. Keying on `checklist?.id` re-stages once
  // that arrives late, without re-staging (and discarding an in-progress edit) on every subsequent
  // change to the *same* checklist while the dialog stays open — its `id` doesn't change just
  // because `startedAt`/`endedDate` do.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (mode) resetStagedFields();
  }, [mode, checklist?.id]);

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

  // One occurrence's own length (`End - Start`) — already milliseconds, a plain `Date` diff, so
  // no unit conversion either way. Meaningless for an all-day schedule (nothing timed to measure)
  // or with no End Date set at all, so `undefined` in both those cases rather than a bogus
  // 0/negative value. Shared by the owner's Schedule save and a participant's My Reminder save
  // below — both stage the same `tempStartDay`/`tempEndDay`/`tempAllDay`.
  const computeDurationMs = (): number | undefined =>
    !tempAllDay && tempEndDay
      ? Math.max(1, new Date(tempEndDay).getTime() - new Date(tempStartDay).getTime())
      : undefined;

  const handleSaveSchedule = () => {
    const repeat = calculateRepeat({
      weeklyHobbies: recurrenceValueToDays(tempRecurrence),
      selectedTime: tempTime,
      startedAt: tempStartDay,
      allDay: tempAllDay,
      durationMs: isOneOffTask ? undefined : computeDurationMs(),
      ...recurrenceValueToExtra(tempRecurrence),
    });

    const finalRepeat = {
      ...(repeat ?? noScheduleRepeatBase(tempAllDay, tempTime)),
      startedAt: tempStartDay,
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
    // Only a one-off task's Start/End Date belong to its own checklist row — a repeating (or
    // field-group) template's own Start/End Date became `repeat.durationMs` above instead, via
    // `finalRepeat`; there's no single checklist instance they'd write to here anyway.
    if (isOneOffTask && checklist) {
      onUpdateChecklist?.({ id: checklist.id, startedAt: tempStartDay, endedDate: tempEndDay || undefined });
    }
    onClose();

    const wasAlreadyRecurring = !!checklistTemplate.repeat?.byday && !hasFieldGroups;
    if (onSplitSchedule && wasAlreadyRecurring) {
      // Least-drastic option first, when there's a real single occurrence to scope it to (same
      // gate the picker below applies to actually offering it) — the option most edits probably
      // want, same reasoning DeleteTaskModal's own scope picker defaults to "This event."
      setScheduleScope(onModifyOccurrence && checklist ? 'thisEvent' : 'thisAndFollowing');
      setPendingScheduleRepeat(finalRepeat);
      return;
    }

    onUpdate({ ...checklistTemplate, repeat: finalRepeat, scheduleMode: tempScheduleMode });
  };

  const handleConfirmScheduleScope = () => {
    if (!pendingScheduleRepeat) return;
    const repeat = pendingScheduleRepeat;
    setPendingScheduleRepeat(null);
    if (scheduleScope === 'thisEvent' && checklist) {
      // "This event" — the occurrence keeps its own place in the series (still generated,
      // still counted), just at the moment `tempStartDay` staged, via a `MODIFIED`
      // schedule_exceptions row (see checklistTemplateTypes.ts's own `modifiedOccurrences` doc
      // comment) rather than touching `checklistTemplate.repeat` at all. `checklist.startedAt` —
      // not `tempStartDay`, in case the Start Date field itself got edited too — is the
      // occurrence's own exact moment being overridden (a plain calendar day can't tell two
      // same-day occurrences apart, see the `schedule_exceptions` table's own migration);
      // `tempStartDay` is the new moment.
      onModifyOccurrence?.(checklist.startedAt, tempStartDay);
      // Same immediate write-back isOneOffTask's own save already does — reflects the change on
      // this exact row right away rather than waiting on a refetch to pick up the exception.
      onUpdateChecklist?.({ id: checklist.id, startedAt: tempStartDay, endedDate: tempEndDay || undefined });
    } else if (scheduleScope === 'thisAndFollowing') {
      // The occurrence actually being viewed, not "right now" — this page can be open on a past
      // or future day (see initialStartDay's own comment on why Start/End Date already read from
      // this same row), and the whole point of "This and following" is splitting relative to
      // *that* day. Using today's real date here instead used to cap the original template's
      // `until` (and start the new one) at whatever day happened to be current when the edit was
      // saved, not the occurrence being edited — silently pulling other, untouched days onto the
      // new pattern (or leaving them on the old one) whenever the two didn't coincide.
      onSplitSchedule?.(checklist?.startedAt ?? new Date().toISOString(), repeat);
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
      durationMs: computeDurationMs(),
      ...recurrenceValueToExtra(tempRecurrence),
    });
    onUpdateMyReminder?.({
      ...(repeat ?? noScheduleRepeatBase(tempAllDay, tempTime)),
      startedAt: tempStartDay,
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
          already-recurring template (see its own comment on the exact gate). A segmented `Radio`
          inside WarningModal's own `content` slot, not three footer buttons — WarningModal only
          ever has room for one middle ("tertiary") action alongside Cancel/primary, not two; same
          picker shape as DeleteTaskModal's own delete-scope prompt, whose doc comment already
          called out "This event" (a single-occurrence edit) as the reason this needed to scale to
          a third option in the first place. */}
      <WarningModal
        visible={!!pendingScheduleRepeat}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-title',
          defaultMessage: 'Edit recurring task',
        })}
        content={
          <>
            <Typography.Text>
              {intl.formatMessage({
                id: 'checklist-generic-info.edit-scope-message',
                defaultMessage: 'This task repeats. Apply this change to:',
              })}
            </Typography.Text>
            <div className={styles.scopePicker}>
              <Radio
                isButton
                options={[
                  // Only offered when there's a real single occurrence to scope it to — same gate
                  // handleSaveSchedule itself already applies when picking the default scope.
                  ...(onModifyOccurrence && checklist
                    ? [
                        {
                          label: intl.formatMessage({
                            id: 'checklist-generic-info.edit-scope-this',
                            defaultMessage: 'This event',
                          }),
                          value: 'thisEvent',
                        },
                      ]
                    : []),
                  {
                    label: intl.formatMessage({
                      id: 'checklist-generic-info.edit-scope-following',
                      defaultMessage: 'This and following',
                    }),
                    value: 'thisAndFollowing',
                  },
                  {
                    label: intl.formatMessage({
                      id: 'checklist-generic-info.edit-scope-all',
                      defaultMessage: 'All events',
                    }),
                    value: 'all',
                  },
                ]}
                value={scheduleScope}
                onChangeValue={(v: ScheduleScope) => setScheduleScope(v)}
              />
            </div>
          </>
        }
        secondaryButtonText={intl.formatMessage({
          id: 'checklist-generic-info.edit-scope-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={handleCancelScheduleScope}
        primaryButtonText={intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
        primaryButtonOnClick={handleConfirmScheduleScope}
      />
    </>
  );
};

export default ScheduleEditDialogs;
