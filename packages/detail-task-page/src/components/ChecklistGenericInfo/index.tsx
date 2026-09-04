import React from 'react';
import {
  ChecklistTemplate,
  FieldGroup,
  useChecklistTemplates,
  useFieldGroups,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  getActiveFieldGroups,
  getArchivedFieldGroups,
  mergeEditedFieldGroups,
  localDateStringToISO,
  getClientTimezone,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import DatePicker from '@moon-ui/date-picker';
import { SettingsCard, SettingsRow } from '../SettingsCard';
import Dialog from '@moon-ui/modal/src/Dialog';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import Button from '@moon-ui/button/src/DefaultButton';
import { motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';
import { startOfDay } from 'date-fns';

// Import existing components for editing
import IconPicker from '@pregnant/create-checklist-page-ui/src/IconPicker';
import TagInput from '@pregnant/create-checklist-page-ui/src/TagInput';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { calculateRepeat } from '@pregnant/create-checklist-page-ui/src/calculateRepeat';
import { GroupScheduleList, ScheduleModalContent, WeekDaysPills } from '@pregnant/create-checklist-page-ui';

import styles from './index.module.scss';

type Props = {
  checklistTemplate: ChecklistTemplate;
  onUpdate: (template: ChecklistTemplate) => void;
  isDefaultCollapsed: boolean;
  // Omitted entirely (not just a no-op) for a challenge participant who isn't the
  // template's owner — same "isOwner" gate index.desktop.tsx/index.mobile.tsx
  // already apply to onUpdate, but here it also decides whether the row renders
  // at all, since a non-owner shouldn't see a delete affordance for someone
  // else's task in the first place.
  onDelete?: () => void;
  // Same "isOwner" gate as onDelete above, but for the Icon & Color / Schedule / Tags rows:
  // index.desktop.tsx/index.mobile.tsx already pass a no-op `onUpdate` for a non-owner, but
  // without this the pencil icons and row onClicks still opened the edit modals regardless —
  // a participant could fill out the whole form, hit Save, and have it silently do nothing
  // (the no-op onUpdate swallowing it), no different-looking from a real save. Hides the edit
  // affordance instead, same as onDelete already does.
  readOnly?: boolean;
  /**
   * Present only for a challenge participant (never the owner — see index.desktop.tsx/
   * index.mobile.tsx's own `!isOwner && challenge` gate) — lets them set their own reminder
   * day/time distinct from the owner's, without needing `readOnly` lifted for anything else
   * about the template. Passing `null` clears the override, falling back to the owner's
   * schedule (see useChecklistTemplates.tsx's `updateMyReminder`). Undefined for the owner's own
   * view, or for a template with no challenge at all — the Schedule row stays plain read-only
   * (no edit affordance) in both those cases, same as before this existed.
   */
  onUpdateMyReminder?: (repeat: ChecklistTemplate['repeat'] | null) => void;
  // Extra rows rendered in this same card, after Archived Groups and before Delete Task
  // (the one destructive row stays last on purpose) — CardShare is the one caller today,
  // so Share reads as part of General Settings instead of a second card floating below it.
  children?: React.ReactNode;
};

enum EditModal {
  None,
  Icon,
  Schedule,
  Tags,
  Archived,
  MyReminder,
  StartDate,
  EndDate,
}

// Fallback shape for `repeat` when a Start/End Date edit is the very first schedule-shaped write
// this template ever gets — a hasFieldGroups template can genuinely have no top-level `repeat` at
// all (see formatDisplayStartDate's own comment) but `startedAt`/`endedAt` still need *some* base
// object to sit on, since `repeat`'s other fields aren't optional. Every other field here already
// reads as "unset" (`dayOfWeek: '*'` — every day — is exactly what getEffectiveDayOfWeek falls
// back to on its own, and this template already isn't gated by it if it has field groups).
const DEFAULT_REPEAT_BASE = { hour: '8', minute: '0', dayOfMonth: '*', month: '*', dayOfWeek: '*' };

// Fallback shape for `repeat` when calculateRepeat itself returns `undefined` — empty-string
// "not scheduled" sentinels, matching createTaskUtil.ts's own non-recurring branch (and
// getEffectiveDayOfWeek/getChecklistTemplateIdsByGivingDate's own reading of `dayOfWeek: ''`),
// not DEFAULT_REPEAT_BASE above — that reads as "every day at 8am," which would turn a template
// with genuinely no template-level schedule into one the moment its Start Date/timezone gets
// touched.
const NO_SCHEDULE_REPEAT_BASE = { hour: '', minute: '', dayOfMonth: '', month: '', dayOfWeek: '' };

const ChecklistGenericInfo = ({
  checklistTemplate,
  onUpdate,
  isDefaultCollapsed,
  onDelete,
  readOnly,
  onUpdateMyReminder,
  children,
}: Props) => {
  const intl = useIntl();
  // `fieldGroups` isn't part of the template's own row anymore — a schedule edit
  // (GroupScheduleList, below) or a group restore is its own write now, one row at a time (see
  // useFieldGroups.tsx), not folded into `onUpdate`'s template patch.
  const { updateFieldGroup, updateMyFieldGroupRepeat } = useFieldGroups();
  const [isCollapsed, setIsCollapsed] = React.useState(isDefaultCollapsed);
  const [activeModal, setActiveModal] = React.useState<EditModal>(
    EditModal.None,
  );
  const [deleteConfirmVisible, setDeleteConfirmVisible] = React.useState(false);

  // Form states for editing
  const [tempIcon, setTempIcon] = React.useState(
    checklistTemplate.avatar?.name || '',
  );
  const [tempColor, setTempColor] = React.useState(
    checklistTemplate.avatar?.color || '#607d8b',
  );
  const [tempStartDay, setTempStartDay] = React.useState(
    checklistTemplate.repeat?.startedAt || startOfDay(new Date()).toISOString(),
  );
  const [tempTime, setTempTime] = React.useState(
    checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
      ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
      : '',
  );
  const [tempEndDay, setTempEndDay] = React.useState(checklistTemplate.repeat?.endedAt || '');
  const [tempWeeklyHobbies, setTempWeeklyHobbies] = React.useState<Day[]>(
    getDaysFromRepeat(checklistTemplate.repeat),
  );
  const [tempTags, setTempTags] = React.useState<string[]>(
    checklistTemplate.tags || [],
  );
  const [tempFieldGroups, setTempFieldGroups] = React.useState<FieldGroup[]>(
    checklistTemplate.fieldGroups,
  );

  const formatDisplayTime = () => {
    if (checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute) {
      return `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`;
    }
    return 'Not set';
  };

  // Once a template has field groups, its own day-of-week is derived from
  // the union of the groups' own schedules (see @dreamer/global's
  // getEffectiveDayOfWeek) rather than edited here — otherwise a group
  // could end up scheduled for a day the template itself never generates a
  // Checklist instance on, making it silently unreachable.
  const hasFieldGroups = getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).length > 0;
  const archivedFieldGroups = getArchivedFieldGroups(checklistTemplate.fieldGroups ?? []);

  const formatDisplayDays = () => {
    if (hasFieldGroups) {
      return formatDaysOfWeek(getEffectiveDayOfWeek(checklistTemplate) ?? '*');
    }

    const days = getDaysFromRepeat(checklistTemplate.repeat);
    if (days.length === 0) return 'Not set';
    if (days.length === 7) return 'Every day';

    const dayNames = {
      [Day.Mon]: 'Mon',
      [Day.Tue]: 'Tue',
      [Day.Wed]: 'Wed',
      [Day.Thu]: 'Thu',
      [Day.Fri]: 'Fri',
      [Day.Sat]: 'Sat',
      [Day.Sun]: 'Sun',
    };

    return days.map(day => dayNames[day]).join(', ');
  };

  const formatDisplayStartDate = () => {
    if (checklistTemplate.repeat?.startedAt) {
      return new Date(checklistTemplate.repeat.startedAt).toLocaleDateString();
    }
    // A template with field groups but no template-level `repeat` at all (schedules were only
    // ever set per-group, the template's own Schedule modal never saved) has no start date to
    // show — but it does have a real schedule, already shown in the row's description via the
    // derived days. "Not set" here read as if nothing were configured at all. See withSyncedRepeat
    // in useChecklistTemplates.tsx for why `repeat` can be entirely absent in this case.
    return hasFieldGroups ? '' : 'Not set';
  };

  const formatDisplayEndDate = () => {
    if (checklistTemplate.repeat?.endedAt) {
      return new Date(checklistTemplate.repeat.endedAt).toLocaleDateString();
    }
    return 'No end date';
  };

  const formatDisplayTags = () => {
    if (!checklistTemplate.tags || checklistTemplate.tags.length === 0) {
      return 'No tags';
    }
    return checklistTemplate.tags.join(', ');
  };

  const handleSaveIcon = () => {
    onUpdate({
      ...checklistTemplate,
      avatar: {
        ...checklistTemplate.avatar,
        name: tempIcon,
        color: tempColor,
      },
    });
    setActiveModal(EditModal.None);
  };

  // Start/End Date are their own top-level rows now (see the enum's own comment), each staged
  // independently and writing only the one field into `repeat` — everything else on it (hour/
  // minute/dayOfWeek/...) carries through unchanged from whatever's already there, same as
  // handleSaveSchedule leaves startedAt untouched now that ScheduleModalContent no longer shows
  // it (see the `hideStartDate` prop passed to both dialogs below).
  const handleSaveStartDate = () => {
    onUpdate({
      ...checklistTemplate,
      repeat: {
        ...(checklistTemplate.repeat ?? DEFAULT_REPEAT_BASE),
        startedAt: tempStartDay,
        timezone: getClientTimezone(),
      },
    });
    setActiveModal(EditModal.None);
  };

  const handleSaveEndDate = () => {
    onUpdate({
      ...checklistTemplate,
      repeat: {
        ...(checklistTemplate.repeat ?? { ...DEFAULT_REPEAT_BASE, startedAt: new Date().toISOString() }),
        endedAt: tempEndDay || undefined,
        timezone: getClientTimezone(),
      },
    });
    setActiveModal(EditModal.None);
  };

  const handleSaveSchedule = () => {
    const repeat = calculateRepeat({
      weeklyHobbies: tempWeeklyHobbies,
      selectedTime: tempTime,
    });

    onUpdate({
      ...checklistTemplate,
      // `repeat` is `undefined` when `tempWeeklyHobbies` is empty (a template whose schedule
      // lives entirely on its field groups, with no template-level days of its own — see
      // formatTemplateSchedule's comment elsewhere on this shape) — fall back to the same empty-
      // string "not scheduled" sentinel createTaskUtil.ts's own non-recurring branch uses, not
      // DEFAULT_REPEAT_BASE, which would silently turn this into a real daily-8am schedule.
      repeat: {
        ...(repeat ?? NO_SCHEDULE_REPEAT_BASE),
        startedAt: tempStartDay,
        timezone: getClientTimezone(),
      },
    });
    // GroupScheduleList edits each group's own `repeat` instead of the day picker above — its
    // own write, per changed group, not folded into the template patch.
    if (!readOnly) {
      tempFieldGroups.forEach(group => {
        const original = checklistTemplate.fieldGroups.find(g => g.id === group.id);
        if (original && JSON.stringify(group) !== JSON.stringify(original)) {
          updateFieldGroup(group);
        }
      });
    }
    setActiveModal(EditModal.None);
  };

  // Same tempWeeklyHobbies/tempTime/tempStartDay (or tempFieldGroups, for a template with real
  // field groups) staging as handleSaveSchedule above — the modal starts from whatever's
  // currently effective (the owner's default, or this participant's own override — see
  // resetModalStates), just written through onUpdateMyReminder/updateMyFieldGroupRepeat instead
  // of onUpdate/updateFieldGroup so it lands on the caller's own row, never the owner's.
  //
  // A template with real field groups derives its own top-level schedule from the union of the
  // groups' own (see hasFieldGroups' own comment) — a participant can't override that derived
  // value directly, only each group's own, via the same per-row editor the owner's Schedule modal
  // uses (GroupScheduleList, reusing tempFieldGroups — see its own render below), just persisted
  // one PATCH per changed group through updateMyFieldGroupRepeat instead of the owner's full-row
  // updateFieldGroup.
  const handleSaveMyReminder = () => {
    if (hasFieldGroups) {
      tempFieldGroups.forEach(group => {
        const original = checklistTemplate.fieldGroups.find(g => g.id === group.id);
        if (original && JSON.stringify(group.repeat ?? null) !== JSON.stringify(original.repeat ?? null)) {
          updateMyFieldGroupRepeat(group.id, group.repeat ?? null);
        }
      });
      setActiveModal(EditModal.None);
      return;
    }

    const repeat = calculateRepeat({
      weeklyHobbies: tempWeeklyHobbies,
      selectedTime: tempTime,
    });
    onUpdateMyReminder?.({
      ...(repeat ?? NO_SCHEDULE_REPEAT_BASE),
      startedAt: tempStartDay,
      timezone: getClientTimezone(),
    });
    setActiveModal(EditModal.None);
  };

  // Clears this participant's override(s) — the row(s) reappear showing the owner's default on
  // the next fetch (see updateMyReminder's own comment on why that always re-fetches; a group's
  // own updateMyFieldGroupRepeat(id, null) is the same idea, one group at a time).
  const handleResetMyReminder = () => {
    if (hasFieldGroups) {
      getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).forEach(group => {
        updateMyFieldGroupRepeat(group.id, null);
      });
      setActiveModal(EditModal.None);
      return;
    }
    onUpdateMyReminder?.(null);
    setActiveModal(EditModal.None);
  };

  const handleSaveTags = () => {
    onUpdate({
      ...checklistTemplate,
      tags: tempTags,
    });
    setActiveModal(EditModal.None);
  };

  // Restores immediately, no staging — this is a plain toggle of one field on one group, not a
  // multi-field form like the modals above. `archivedAt: null`, not `undefined` — see
  // FieldGroup.archivedAt's own comment on why `undefined` here would silently fail to persist.
  const handleRestoreGroup = (groupId: string) => {
    if (readOnly) return;
    const group = checklistTemplate.fieldGroups.find(g => g.id === groupId);
    if (group) updateFieldGroup({ ...group, archivedAt: null });
  };

  const resetModalStates = () => {
    setTempIcon(checklistTemplate.avatar?.name || '');
    setTempColor(checklistTemplate.avatar?.color || '#607d8b');
    setTempStartDay(checklistTemplate.repeat?.startedAt || startOfDay(new Date()).toISOString());
    setTempTime(
      checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
        ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
        : '',
    );
    setTempEndDay(checklistTemplate.repeat?.endedAt || '');
    setTempWeeklyHobbies(getDaysFromRepeat(checklistTemplate.repeat));
    setTempTags(checklistTemplate.tags || []);
    setTempFieldGroups(checklistTemplate.fieldGroups);
  };

  const handleModalClose = () => {
    resetModalStates();
    setActiveModal(EditModal.None);
  };

  return (
    <>
      <SettingsCard>
        <SettingsRow
          logo={
            <Icon
              width={24}
              icon={checklistTemplate.avatar?.name || 'solar:settings-linear'}
              color={checklistTemplate.avatar?.color || '#607d8b'}
            />
          }
          title={
            <Typography.Title level={4} noMargin>
              General Settings
            </Typography.Title>
          }
          rightComponent={
            <Icon
              width={20}
              icon={
                isCollapsed
                  ? 'solar:alt-arrow-down-linear'
                  : 'solar:alt-arrow-up-linear'
              }
            />
          }
          onClick={() => setIsCollapsed(!isCollapsed)}
          // Still clickable (collapses/expands, cursor stays a pointer), but deliberately no
          // hover fill — this is the card's own title, not a list item, and an earlier pass
          // already removed that highlight on purpose (it read as one more actionable row
          // rather than the section heading it is).
          hoverBackground={false}
        />

        <motion.div
          initial={false}
          animate={{
            height: isCollapsed ? 0 : 'auto',
            opacity: isCollapsed ? 0 : 1,
          }}
          transition={{
            height: { type: 'spring', stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 },
          }}
          style={{ overflow: 'hidden' }}
        >
          <div className={styles.content}>
            {/* Start Date — its own row now, not bundled into Schedule below (see
                handleSaveStartDate's own comment and the `hideStartDate` prop passed to both
                ScheduleModalContent dialogs further down). */}
            <SettingsRow
              logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
              title={intl.formatMessage({
                id: 'checklist-generic-info.start-date-title',
                defaultMessage: 'Start Date',
              })}
              description={intl.formatMessage({
                id: 'checklist-generic-info.start-date-description',
                defaultMessage: 'The first day this task is active',
              })}
              rightComponent={
                <div className={styles.displayRow}>
                  {formatDisplayStartDate() && (
                    <Typography.Text>{formatDisplayStartDate()}</Typography.Text>
                  )}
                  {!readOnly && (
                    <Icon
                      width={16}
                      icon="solar:pen-2-line-duotone"
                      className={styles.editIcon}
                      onClick={e => {
                        e.stopPropagation();
                        resetModalStates();
                        setActiveModal(EditModal.StartDate);
                      }}
                    />
                  )}
                </div>
              }
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      resetModalStates();
                      setActiveModal(EditModal.StartDate);
                    }
              }
            />

            {/* End Date */}
            <SettingsRow
              logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
              title={intl.formatMessage({
                id: 'checklist-generic-info.end-date-title',
                defaultMessage: 'End Date',
              })}
              description={intl.formatMessage({
                id: 'checklist-generic-info.end-date-description',
                defaultMessage: 'Stops generating after this day',
              })}
              rightComponent={
                <div className={styles.displayRow}>
                  <Typography.Text>{formatDisplayEndDate()}</Typography.Text>
                  {!readOnly && (
                    <Icon
                      width={16}
                      icon="solar:pen-2-line-duotone"
                      className={styles.editIcon}
                      onClick={e => {
                        e.stopPropagation();
                        resetModalStates();
                        setActiveModal(EditModal.EndDate);
                      }}
                    />
                  )}
                </div>
              }
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      resetModalStates();
                      setActiveModal(EditModal.EndDate);
                    }
              }
            />

            {/* Schedule */}
            <SettingsRow
              logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
              title="Schedule"
              description={
                // The merged union of every group's own days (WeekDaysPills, read-only summary
                // — the modal's GroupScheduleList is where each group's own days actually get
                // edited) rather than a comma-separated list. "at HH:MM" is dropped here too:
                // neither the template's own schedule nor a group's has ever gated on
                // time-of-day, only the day, so pairing a real merged value with a leftover
                // default time read as more precise than it actually is.
                hasFieldGroups ? (
                  <WeekDaysPills
                    activeDays={getDaysFromRepeat({
                      dayOfWeek: getEffectiveDayOfWeek(checklistTemplate) ?? '*',
                    })}
                  />
                ) : (
                  <>
                    {`${formatDisplayDays()} at ${formatDisplayTime()}`}
                    {/* Only ever set for a participant who's overridden the owner's default —
                        see ChecklistTemplate['repeat'].isPersonal's own comment. */}
                    {checklistTemplate.repeat?.isPersonal && (
                      <Typography.Text className={styles.personalBadge}>
                        {' · '}
                        {intl.formatMessage({
                          id: 'checklist-generic-info.personal-reminder-badge',
                          defaultMessage: 'Your reminder',
                        })}
                      </Typography.Text>
                    )}
                  </>
                )
              }
              rightComponent={
                <div className={styles.displayRow}>
                  {!readOnly && (
                    <Icon
                      width={16}
                      icon="solar:pen-2-line-duotone"
                      className={styles.editIcon}
                      onClick={e => {
                        e.stopPropagation();
                        resetModalStates();
                        setActiveModal(EditModal.Schedule);
                      }}
                    />
                  )}
                  {/* A participant can't edit the shared schedule (readOnly), but can still set
                      their own reminder time on top of it — see onUpdateMyReminder's own comment
                      on why this is a separate write from the owner's. */}
                  {readOnly && onUpdateMyReminder && (
                    <Icon
                      width={16}
                      icon="solar:bell-bing-line-duotone"
                      className={styles.editIcon}
                      onClick={e => {
                        e.stopPropagation();
                        resetModalStates();
                        setActiveModal(EditModal.MyReminder);
                      }}
                    />
                  )}
                </div>
              }
              onClick={
                !readOnly
                  ? () => {
                      resetModalStates();
                      setActiveModal(EditModal.Schedule);
                    }
                  : onUpdateMyReminder
                    ? () => {
                        resetModalStates();
                        setActiveModal(EditModal.MyReminder);
                      }
                    : undefined
              }
            />

            {/* Icon & Color */}
            <SettingsRow
              logo={<Icon width={24} icon="tdesign:icon" />}
              title="Icon & Color"
              description="Customize appearance"
              rightComponent={
                <div className={styles.displayRow}>
                  <Icon
                    width={24}
                    icon={
                      checklistTemplate.avatar?.name ||
                      'solar:question-circle-linear'
                    }
                    color={checklistTemplate.avatar?.color || '#607d8b'}
                  />
                  {!readOnly && (
                    <Icon
                      width={16}
                      icon="solar:pen-2-line-duotone"
                      className={styles.editIcon}
                      onClick={() => {
                        resetModalStates();
                        setActiveModal(EditModal.Icon);
                      }}
                    />
                  )}
                </div>
              }
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      resetModalStates();
                      setActiveModal(EditModal.Icon);
                    }
              }
            />

            {/* Tags */}
            <SettingsRow
              logo={<Icon width={24} icon="solar:tag-outline" />}
              title="Tags"
              description={formatDisplayTags()}
              rightComponent={
                !readOnly && (
                  <Icon
                    width={16}
                    icon="solar:pen-2-line-duotone"
                    className={styles.editIcon}
                    onClick={e => {
                      e.stopPropagation();
                      resetModalStates();
                      setActiveModal(EditModal.Tags);
                    }}
                  />
                )
              }
              onClick={
                readOnly
                  ? undefined
                  : () => {
                      resetModalStates();
                      setActiveModal(EditModal.Tags);
                    }
              }
            />

            {/* Archived Groups — only shown once there's something to restore */}
            {archivedFieldGroups.length > 0 && (
              <SettingsRow
                logo={<Icon width={24} icon="solar:trash-bin-2-linear" />}
                title="Archived Groups"
                description={`${archivedFieldGroups.length} deleted group${archivedFieldGroups.length === 1 ? '' : 's'}`}
                rightComponent={<Icon width={16} icon="solar:alt-arrow-right-linear" />}
                onClick={() => setActiveModal(EditModal.Archived)}
              />
            )}

            {children}

            {/* Delete — permanent, unlike Archived Groups above (which is a
                recoverable soft-delete of a group). Only rendered for the
                owner; a challenge participant never gets onDelete at all. */}
            {onDelete && (
              <SettingsRow
                logo={<Icon width={24} icon="solar:trash-bin-trash-linear" color="#ff4d4f" />}
                title="Delete Task"
                description="Permanently remove this task and its history"
                danger
                onClick={() => setDeleteConfirmVisible(true)}
              />
            )}
          </div>
        </motion.div>
      </SettingsCard>

      {/* Start Date Edit Modal */}
      <Dialog
        visible={activeModal === EditModal.StartDate}
        onDismiss={handleModalClose}
        icon="solar:calendar-mark-line-duotone"
        // Same staged-until-Save shape as every other row here — tempStartDay only commits on
        // this Save (handleSaveStartDate).
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-start-date-title',
          defaultMessage: 'Edit Start Date',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSaveStartDate} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
      >
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({
            id: 'checklist-generic-info.start-date-title',
            defaultMessage: 'Start Date',
          })}
          description={intl.formatMessage({
            id: 'checklist-generic-info.start-date-description',
            defaultMessage: 'The first day this task is active',
          })}
          rightComponent={
            <DatePicker
              value={tempStartDay}
              onChange={e => setTempStartDay(localDateStringToISO(e.target.value))}
              className={styles.dateInput}
            />
          }
        />
      </Dialog>

      {/* End Date Edit Modal */}
      <Dialog
        visible={activeModal === EditModal.EndDate}
        onDismiss={handleModalClose}
        icon="solar:calendar-mark-line-duotone"
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-end-date-title',
          defaultMessage: 'Edit End Date',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSaveEndDate} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
      >
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:calendar-mark-line-duotone" />}
          noPaddingHorizontal
          title={intl.formatMessage({
            id: 'checklist-generic-info.end-date-title',
            defaultMessage: 'End Date',
          })}
          description={intl.formatMessage({
            id: 'checklist-generic-info.end-date-description',
            defaultMessage: 'Stops generating after this day',
          })}
          rightComponent={
            <DatePicker
              value={tempEndDay}
              onChange={e => setTempEndDay(e.target.value ? localDateStringToISO(e.target.value) : '')}
              className={styles.dateInput}
            />
          }
        />
        {tempEndDay && (
          <div className={styles.resetReminderRow}>
            <Button type="ghost" size="sm" onClick={() => setTempEndDay('')}>
              {intl.formatMessage({
                id: 'checklist-generic-info.clear-end-date',
                defaultMessage: 'Clear end date',
              })}
            </Button>
          </div>
        )}
      </Dialog>

      {/* Icon & Color Edit Modal */}
      <Dialog
        visible={activeModal === EditModal.Icon}
        onDismiss={handleModalClose}
        icon="tdesign:icon"
        // `tempIcon`/`tempColor` only commit on the header's own Save (handleSaveIcon) — a
        // stray backdrop click shouldn't be able to discard a picked icon/color the same way.
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-icon-color-title',
          defaultMessage: 'Edit Icon & Color',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSaveIcon} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
      >
        <IconPicker
          selectedIcon={tempIcon}
          setSelectedIcon={setTempIcon}
          selectedColor={tempColor}
          setSelectedColor={setTempColor}
          layout="two-line"
        />
      </Dialog>

      {/* Schedule Edit Modal */}
      <Dialog
        visible={activeModal === EditModal.Schedule}
        onDismiss={handleModalClose}
        icon="solar:calendar-date-line-duotone"
        // Same staged-until-Save shape as Icon/Tags above (tempWeeklyHobbies/tempStartDay/
        // tempTime/tempFieldGroups, only committed by handleSaveSchedule).
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
            <Button onClick={handleSaveSchedule} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
        // ScheduleModalContent already brings its own outer padding (it's shared with
        // SchedulingGroup's own modal, which has no padding of its own to double up on) — this
        // drops Dialog's own so the two don't stack.
        bodyClassName={styles.noBodyPadding}
      >
        <ScheduleModalContent
          tempWeeklyHobbies={tempWeeklyHobbies}
          setTempWeeklyHobbies={setTempWeeklyHobbies}
          tempDate={tempStartDay}
          setTempDate={setTempStartDay}
          tempTime={tempTime}
          setTempTime={setTempTime}
          fieldGroups={tempFieldGroups}
          onFieldGroupsChange={setTempFieldGroups}
          hideStartDate
        />
      </Dialog>

      {/* My Reminder Modal — a challenge participant's own override, distinct from the Schedule
          modal above (owner-only, edits the shared row). For a template with real field groups,
          this shows GroupScheduleList (one row per group, reusing tempFieldGroups — see
          hasFieldGroups' own comment on why the template-level day/time isn't editable directly
          here) instead of the plain day+time picker: a participant can't override the *derived*
          template-level schedule, only each group's own, which is the one that actually matters
          for a template shaped like this. */}
      <Dialog
        visible={activeModal === EditModal.MyReminder}
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
        // GroupScheduleList (unlike ScheduleModalContent) brings none of its own padding — see
        // the Schedule modal's own comment on why *that* one needs this suppressed. Only
        // suppressed here for the ScheduleModalContent branch, or the field-group one would have
        // none at all.
        bodyClassName={hasFieldGroups ? undefined : styles.noBodyPadding}
      >
        {hasFieldGroups ? (
          <GroupScheduleList
            fieldGroups={getActiveFieldGroups(tempFieldGroups)}
            onChange={edited => setTempFieldGroups(mergeEditedFieldGroups(tempFieldGroups, edited))}
          />
        ) : (
          <ScheduleModalContent
            tempWeeklyHobbies={tempWeeklyHobbies}
            setTempWeeklyHobbies={setTempWeeklyHobbies}
            tempDate={tempStartDay}
            setTempDate={setTempStartDay}
            tempTime={tempTime}
            setTempTime={setTempTime}
            hideStartDate
          />
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

      {/* Tags Edit Modal */}
      <Dialog
        visible={activeModal === EditModal.Tags}
        onDismiss={handleModalClose}
        icon="solar:tag-outline"
        // tempTags only commits on handleSaveTags — same reasoning as Icon/Schedule above.
        closeOnOverlayClick={false}
        title={intl.formatMessage({
          id: 'checklist-generic-info.edit-tags-title',
          defaultMessage: 'Edit Tags',
        })}
        headerAction={
          <div className={styles.headerActionsRow}>
            <Button type="ghost" size="sm" onClick={handleModalClose}>
              {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleSaveTags} className={styles.headerSaveButton}>
              {intl.formatMessage({ id: 'label-save', defaultMessage: 'Save' })}
            </Button>
          </div>
        }
      >
        <TagInput tags={tempTags} setTags={setTempTags} />
      </Dialog>

      {/* Archived Groups — restore, one at a time. No "delete forever" here on purpose: this
          screen exists specifically to make a soft delete recoverable; a permanent-delete action
          belongs somewhere that says so explicitly, not folded into a restore list. No header
          Save action — a restore applies immediately per row (see handleRestoreGroup), same as
          every other instantly-saving control elsewhere in this app. */}
      <Dialog
        visible={activeModal === EditModal.Archived}
        onDismiss={handleModalClose}
        icon="solar:trash-bin-2-linear"
        title={intl.formatMessage({
          id: 'checklist-generic-info.archived-groups-title',
          defaultMessage: 'Archived Groups',
        })}
      >
        {archivedFieldGroups.map(group => (
          <div key={group.id} className={styles.archivedGroupRow}>
            <Typography.Text className={styles.archivedGroupTitle}>
              {group.title ||
                intl.formatMessage({
                  id: 'checklist-generic-info.untitled-group',
                  defaultMessage: 'Untitled group',
                })}
            </Typography.Text>
            <Button onClick={() => handleRestoreGroup(group.id)} type="ghost" size="sm">
              {intl.formatMessage({ id: 'checklist-generic-info.restore-group', defaultMessage: 'Restore' })}
            </Button>
          </div>
        ))}
      </Dialog>

      {/* Delete confirmation — the actual delete is the parent's own onDelete
          (deleteChecklistTemplate + navigate away), this just gates it. */}
      <WarningModal
        visible={deleteConfirmVisible}
        title="Delete this task?"
        content={
          <Typography.Text>
            {`Permanently delete "${checklistTemplate.title}" and its history. This can't be undone.`}
          </Typography.Text>
        }
        primaryButtonText="Delete"
        primaryButtonOnClick={() => {
          setDeleteConfirmVisible(false);
          onDelete?.();
        }}
        secondaryButtonText="Cancel"
        secondaryButtonClick={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
};

export default ChecklistGenericInfo;
