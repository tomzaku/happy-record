import React from 'react';
import cx from 'classnames';
import {
  ChecklistTemplate,
  FieldGroup,
  useChecklistTemplates,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  getActiveFieldGroups,
  getArchivedFieldGroups,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import BottomModal from '@moon-ui/modal/src/BottomModal';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import Button from '@moon-ui/button/src/DefaultButton';
import Division from '@moon-ui/division';
import { motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';

// Import existing components for editing
import IconPicker from '@pregnant/create-checklist-page-ui/src/IconPicker';
import ColorPicker from '@pregnant/create-checklist-page-ui/src/ColorPicker';
import TagInput from '@pregnant/create-checklist-page-ui/src/TagInput';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { calculateRepeat } from '@pregnant/create-checklist-page-ui/src/calculateRepeat';
import { ScheduleModalContent, WeekDaysPills } from '@pregnant/create-checklist-page-ui';

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
};

enum EditModal {
  None,
  Icon,
  Schedule,
  Tags,
  Archived,
}

const ChecklistGenericInfo = ({ checklistTemplate, onUpdate, isDefaultCollapsed, onDelete }: Props) => {
  const intl = useIntl();
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
    checklistTemplate.repeat?.startedAt
      ? new Date(checklistTemplate.repeat.startedAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  );
  const [tempTime, setTempTime] = React.useState(
    checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
      ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
      : '',
  );
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

  const handleSaveSchedule = () => {
    const repeat = calculateRepeat({
      weeklyHobbies: tempWeeklyHobbies,
      selectedTime: tempTime,
    });

    onUpdate({
      ...checklistTemplate,
      repeat: {
        ...repeat,
        startedAt: new Date(tempStartDay).toISOString(),
      },
      // Only actually changed when this template has field groups — GroupScheduleList edits
      // this per group instead of the day picker above; the store resyncs the template's own
      // `repeat.dayOfWeek` from these on save regardless (see withSyncedRepeat in
      // useChecklistTemplates.tsx), so what's picked into `repeat` above doesn't need to agree.
      fieldGroups: tempFieldGroups,
    });
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
    onUpdate({
      ...checklistTemplate,
      fieldGroups: checklistTemplate.fieldGroups.map(group =>
        group.id === groupId ? { ...group, archivedAt: null } : group,
      ),
    });
  };

  const resetModalStates = () => {
    setTempIcon(checklistTemplate.avatar?.name || '');
    setTempColor(checklistTemplate.avatar?.color || '#607d8b');
    setTempStartDay(
      checklistTemplate.repeat?.startedAt
        ? new Date(checklistTemplate.repeat.startedAt)
            .toISOString()
            .split('T')[0]
        : new Date().toISOString().split('T')[0],
    );
    setTempTime(
      checklistTemplate.repeat?.hour && checklistTemplate.repeat?.minute
        ? `${checklistTemplate.repeat.hour.padStart(2, '0')}:${checklistTemplate.repeat.minute.padStart(2, '0')}`
        : '',
    );
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
      <Card className={styles.cardContainer}>
        <div
          className={styles.header}
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className={styles.titleSection}>
            <Icon
              width={24}
              icon={checklistTemplate.avatar?.name || 'solar:settings-linear'}
              color={checklistTemplate.avatar?.color || '#607d8b'}
            />
            <Typography.Title level={4} noMargin>
              General Settings
            </Typography.Title>
          </div>
          <Icon
            width={20}
            icon={
              isCollapsed
                ? 'solar:alt-arrow-down-linear'
                : 'solar:alt-arrow-up-linear'
            }
          />
        </div>

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
            {/* Icon & Color */}
            <List.ItemMeta
              className={styles.settingRow}
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
                  <Icon
                    width={16}
                    icon="solar:pen-2-line-duotone"
                    className={styles.editIcon}
                    onClick={() => {
                      resetModalStates();
                      setActiveModal(EditModal.Icon);
                    }}
                  />
                </div>
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Icon);
              }}
            />

            {/* Schedule */}
            <List.ItemMeta
              className={styles.settingRow}
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
                  `${formatDisplayDays()} at ${formatDisplayTime()}`
                )
              }
              rightComponent={
                <div className={styles.displayRow}>
                  {formatDisplayStartDate() && (
                    <Typography.Text>{formatDisplayStartDate()}</Typography.Text>
                  )}
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
                </div>
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Schedule);
              }}
            />

            {/* Tags */}
            <List.ItemMeta
              className={styles.settingRow}
              logo={<Icon width={24} icon="solar:tag-outline" />}
              title="Tags"
              description={formatDisplayTags()}
              rightComponent={
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
              }
              noPaddingHorizontal
              onClick={() => {
                resetModalStates();
                setActiveModal(EditModal.Tags);
              }}
            />

            {/* Archived Groups — only shown once there's something to restore */}
            {archivedFieldGroups.length > 0 && (
              <List.ItemMeta
                className={styles.settingRow}
                logo={<Icon width={24} icon="solar:trash-bin-2-linear" />}
                title="Archived Groups"
                description={`${archivedFieldGroups.length} deleted group${archivedFieldGroups.length === 1 ? '' : 's'}`}
                rightComponent={<Icon width={16} icon="solar:alt-arrow-right-linear" />}
                noPaddingHorizontal
                onClick={() => setActiveModal(EditModal.Archived)}
              />
            )}

            {/* Delete — permanent, unlike Archived Groups above (which is a
                recoverable soft-delete of a group). Only rendered for the
                owner; a challenge participant never gets onDelete at all. */}
            {onDelete && (
              <List.ItemMeta
                className={cx(styles.settingRow, styles.deleteRow)}
                logo={<Icon width={24} icon="solar:trash-bin-trash-linear" color="#ff4d4f" />}
                title="Delete Task"
                description="Permanently remove this task and its history"
                noPaddingHorizontal
                onClick={() => setDeleteConfirmVisible(true)}
              />
            )}
          </div>
        </motion.div>
      </Card>

      {/* Icon & Color Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Icon}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Icon & Color
              </Typography.Title>
              <Button onClick={handleSaveIcon} className={styles.saveButton}>
                Save
              </Button>
            </div>
            <div className={styles.modalContent}>
              <IconPicker
                selectedIcon={tempIcon}
                setSelectedIcon={setTempIcon}
                selectedColor={tempColor}
                setSelectedColor={setTempColor}
                layout="two-line"
              />
            </div>
          </div>
        }
      />

      {/* Schedule Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Schedule}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Schedule
              </Typography.Title>
              <Button
                onClick={handleSaveSchedule}
                className={styles.saveButton}
              >
                Save
              </Button>
            </div>
            <ScheduleModalContent
              tempWeeklyHobbies={tempWeeklyHobbies}
              setTempWeeklyHobbies={setTempWeeklyHobbies}
              tempDate={tempStartDay}
              setTempDate={setTempStartDay}
              tempTime={tempTime}
              setTempTime={setTempTime}
              isDesktop={false}
              fieldGroups={tempFieldGroups}
              onFieldGroupsChange={setTempFieldGroups}
            />
          </div>
        }
      />

      {/* Tags Edit Modal */}
      <BottomModal
        visible={activeModal === EditModal.Tags}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Edit Tags
              </Typography.Title>
              <Button onClick={handleSaveTags} className={styles.saveButton}>
                Save
              </Button>
            </div>
            <div className={styles.modalContent}>
              <TagInput tags={tempTags} setTags={setTempTags} />
              <div style={{ height: 100 }} />
            </div>
          </div>
        }
      />

      {/* Archived Groups — restore, one at a time. No "delete forever" here on purpose: this
          screen exists specifically to make a soft delete recoverable; a permanent-delete action
          belongs somewhere that says so explicitly, not folded into a restore list. */}
      <BottomModal
        visible={activeModal === EditModal.Archived}
        onDismiss={handleModalClose}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                Archived Groups
              </Typography.Title>
            </div>
            <div className={styles.modalContent}>
              {archivedFieldGroups.map(group => (
                <div key={group.id} className={styles.archivedGroupRow}>
                  <Typography.Text className={styles.archivedGroupTitle}>
                    {group.title || 'Untitled group'}
                  </Typography.Text>
                  <Button onClick={() => handleRestoreGroup(group.id)} type="ghost" size="sm">
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </div>
        }
      />

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
