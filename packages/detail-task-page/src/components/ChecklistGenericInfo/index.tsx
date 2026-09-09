import React from 'react';
import {
  Checklist,
  ChecklistTemplate,
  useChecklistTemplates,
  useFieldGroups,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  getActiveFieldGroups,
  getArchivedFieldGroups,
  hasGroupSchedule,
  ALL_ICAL_DAYS,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { SettingsCard, SettingsRow } from '../SettingsCard';
import Dialog from '@moon-ui/modal/src/Dialog';
import Button from '@moon-ui/button/src/DefaultButton';
import { motion } from 'motion/react';
import { useIntl } from '@dreamer/translation';
import { Day } from '@dreamer/tasks-page-common';

// Import existing components for editing
import IconPicker from '@pregnant/create-checklist-page-ui/src/IconPicker';
import TagInput from '@pregnant/create-checklist-page-ui/src/TagInput';
import { getDaysFromRepeat } from '@pregnant/create-checklist-page-ui/src/getDayFromRepeat';
import { WeekDaysPills } from '@pregnant/create-checklist-page-ui';
import ScheduleEditDialogs from './ScheduleEditDialogs';

import styles from './index.module.scss';

type Props = {
  checklistTemplate: ChecklistTemplate;
  /**
   * The specific day's own Checklist instance being viewed, when there is one — a one-off
   * template (`repeat.recurring === false`, no active field groups) only ever has exactly one
   * real instance for its whole lifetime, so this doubles as `useChecklists.tsx`'s own "any row"
   * check: its `startedAt`/`endedDate` are what `formatDisplayStartEndDate` below actually shows
   * for that shape of task — the template's own `repeat.startedAt`/`until` are a schedule, not
   * this task's own dates, and `repeat.until` is deliberately never set for a one-off task in the
   * first place (see `createTaskUtil.ts`'s own comment). Undefined for a recurring/field-group
   * template, where there's no single instance this row-level signal could mean anything for.
   */
  checklist?: Checklist;
  onUpdate: (template: ChecklistTemplate) => void;
  /**
   * Present only for the owner (same gate as `onUpdate` — see index.desktop.tsx/index.mobile.tsx),
   * and only actually offered by `handleSaveSchedule` when the template being edited was already
   * a genuine recurring series (real `byday`, no active field groups) before this save — Google
   * Calendar's "edit this and following events." Never offered for a field-group-driven schedule
   * (each group would need its own independent split decision — a real follow-up, not assumed
   * here) or a template with no schedule yet (nothing to split). `effectiveFrom` is always "now"
   * (today) — this dialog is template-level, not tied to any specific day's own Checklist
   * instance, so there's no other date to split from. See useChecklistTemplateMutations.ts's
   * `splitChecklistTemplate`, which this calls into.
   */
  onSplitSchedule?: (effectiveFrom: string, newRepeat: NonNullable<ChecklistTemplate['repeat']>) => void;
  isDefaultCollapsed: boolean;
  // Omitted entirely (not just a no-op) for a challenge participant who isn't the
  // template's owner — same "isOwner" gate index.desktop.tsx/index.mobile.tsx
  // already apply to onUpdate, but here it also decides whether the row renders
  // at all, since a non-owner shouldn't see a delete affordance for someone
  // else's task in the first place.
  //
  // Fires immediately on click — this card no longer owns its own confirm step. The caller opens
  // the same This/This-and-following/All scope `DeleteTaskModal` the calendar's own list uses
  // (`useDeleteTaskFlow`'s `openDelete`), since only the caller (index.desktop.tsx/index.mobile.tsx)
  // has the current day's own Checklist instance in scope to delete "just this occurrence" from.
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
  // Required for a one-off task's Schedule dialog to be able to save an edited End Date at all —
  // see ScheduleEditDialogs' own `isOneOffTask`, which writes there instead of `repeat.until`.
  // Undefined/no-op for a recurring or field-group template, which never calls this.
  onUpdateChecklist?: (patch: Partial<Checklist> & { id: string }) => void;
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
}

const ChecklistGenericInfo = ({
  checklistTemplate,
  checklist,
  onUpdate,
  onSplitSchedule,
  isDefaultCollapsed,
  onDelete,
  readOnly,
  onUpdateMyReminder,
  onUpdateChecklist,
  children,
}: Props) => {
  const intl = useIntl();
  // `fieldGroups` isn't part of the template's own row anymore — a schedule edit
  // (GroupScheduleList, below) or a group restore is its own write now, one row at a time (see
  // useFieldGroups.tsx), not folded into `onUpdate`'s template patch.
  const { updateFieldGroup } = useFieldGroups();
  const [isCollapsed, setIsCollapsed] = React.useState(isDefaultCollapsed);
  const [activeModal, setActiveModal] = React.useState<EditModal>(
    EditModal.None,
  );

  // Form states for editing
  const [tempIcon, setTempIcon] = React.useState(
    checklistTemplate.avatar?.name || '',
  );
  const [tempColor, setTempColor] = React.useState(
    checklistTemplate.avatar?.color || '#607d8b',
  );
  const [tempTags, setTempTags] = React.useState<string[]>(
    checklistTemplate.tags || [],
  );

  // Once a template has field groups, its own day-of-week is derived from
  // the union of the groups' own schedules (see @dreamer/global's
  // getEffectiveDayOfWeek) rather than edited here — otherwise a group
  // could end up scheduled for a day the template itself never generates a
  // Checklist instance on, making it silently unreachable. Unless the owner has opted into a
  // single combined schedule (`scheduleMode: 'general'`, see hasGroupSchedule) — that makes a
  // field-group template behave exactly like one with none, for every decision below.
  const hasFieldGroups = hasGroupSchedule(checklistTemplate);
  // Raw "does it have field groups at all", independent of scheduleMode — used only to decide
  // whether the Schedule modal needs to ask General-vs-Per-Group at all (see tempScheduleMode
  // below). Every other decision in this file uses hasFieldGroups (mode-aware) instead.
  const hasActiveFieldGroups = getActiveFieldGroups(checklistTemplate.fieldGroups ?? []).length > 0;
  const archivedFieldGroups = getArchivedFieldGroups(checklistTemplate.fieldGroups ?? []);

  const formatDisplayDays = () => {
    if (hasFieldGroups) {
      return formatDaysOfWeek(getEffectiveDayOfWeek(checklistTemplate) ?? ALL_ICAL_DAYS);
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

  const formatTimeSuffix = (byhour?: string, byminute?: string) =>
    byhour && byminute
      ? `${byhour.padStart(2, '0')}:${byminute.padStart(2, '0')}`
      : intl.formatMessage({ id: 'checklist-generic-info.all-day-title', defaultMessage: 'All Day' });

  // The merged Schedule row's own first line — a real date range plus an All Day/time suffix,
  // Google-Calendar-style, so an end date (previously buried inside the Schedule dialog's own Ends
  // section and reported as effectively invisible) is visible right here without opening anything.
  const formatDisplayStartEndDate = () => {
    // A one-off task (`repeat.recurring === false`, no field groups) has no real series to
    // describe — `repeat.startedAt`/`until` are the *schedule*'s own fields, and `until` is
    // deliberately never set for this shape (see createTaskUtil.ts's own comment on why). The
    // task's own dates live on its one real Checklist instance instead — `startedAt`/`endedDate`
    // — so this reads those directly rather than the template's schedule.
    const isOneOff = checklistTemplate.repeat?.recurring === false && !hasFieldGroups;
    if (isOneOff) {
      if (!checklist?.startedAt) return '';
      const start = new Date(checklist.startedAt).toLocaleDateString();
      const end = checklist.endedDate ? new Date(checklist.endedDate).toLocaleDateString() : 'No end date';
      const timeSuffix = formatTimeSuffix(checklistTemplate.repeat?.byhour, checklistTemplate.repeat?.byminute);
      return `${start} – ${end} · ${timeSuffix}`;
    }

    if (!checklistTemplate.repeat?.startedAt) {
      // A template with field groups but no template-level `repeat` at all (schedules were only
      // ever set per-group, the template's own Schedule modal never saved) has no start date to
      // show — but it does have a real schedule, already shown in the Schedule row's second line
      // via the derived days. "Not set" here read as if nothing were configured at all. See
      // withSyncedRepeat in useChecklistTemplates.tsx for why `repeat` can be entirely absent here.
      return hasFieldGroups ? '' : 'Not set';
    }
    const start = new Date(checklistTemplate.repeat.startedAt).toLocaleDateString();
    if (hasFieldGroups) {
      // End Date/Time are per-group here (each group's own row in GroupScheduleList, summarized
      // in the row's second line via formatDisplayGroupEnds) — the template's own `until`/
      // byhour/byminute aren't consulted for scheduling in this mode, so showing them here would
      // just contradict whatever a group's own end/time actually says.
      return intl.formatMessage(
        { id: 'checklist-generic-info.starts-on-date', defaultMessage: 'Starts {{date}}' },
        { date: start },
      );
    }
    // A genuinely recurring template (real `byday`) — this is a real schedule, not a single
    // task's own dates, so it stays sourced from the template's `repeat`.
    const end = checklistTemplate.repeat.until
      ? new Date(checklistTemplate.repeat.until).toLocaleDateString()
      : 'No end date';
    const timeSuffix = formatTimeSuffix(checklistTemplate.repeat.byhour, checklistTemplate.repeat.byminute);
    return `${start} – ${end} · ${timeSuffix}`;
  };

  // Folded into the Schedule row's own description now (RecurrencePicker's Ends section is the
  // only place this gets edited) — no longer a standalone row/dialog, so this only ever needs to
  // render a short suffix, not a full "No end date" sentence.
  const formatEndsSummary = (until?: string, count?: number) => {
    if (until) {
      return intl.formatMessage(
        { id: 'checklist-generic-info.ends-on-date', defaultMessage: 'Ends {{date}}' },
        { date: new Date(until).toLocaleDateString() },
      );
    }
    if (count != null) {
      return intl.formatMessage(
        { id: 'checklist-generic-info.ends-after-count', defaultMessage: 'Ends after {{count}} occurrence(s)' },
        { count: String(count) },
      );
    }
    return '';
  };

  // Template-level only — `until` is dropped here on purpose (it's already shown in this same
  // row's own first line above; repeating it here would just be the same date twice).
  const formatDisplayCount = () => formatEndsSummary(undefined, checklistTemplate.repeat?.count);

  // A field-group template has no single template-level end date (see the mutual-exclusivity rule
  // in ScheduleModalContent) — each active group has its own instead, set from its own row in the
  // Schedule modal's GroupScheduleList. An end date that's actually set on any group must always
  // show here, not just when every group happens to agree — so this surfaces the single soonest
  // cutoff across all of them: the earliest `until` if any group has one (an `until` beats a
  // `count` when both exist, since a real calendar date is the more concrete answer), else the
  // smallest `count`. Groups with no end at all just don't contribute a candidate.
  const formatDisplayGroupEnds = () => {
    const groups = getActiveFieldGroups(checklistTemplate.fieldGroups ?? []);
    const untils = groups.map(g => g.repeat?.until).filter((u): u is string => !!u);
    if (untils.length > 0) {
      const earliest = untils.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
      return formatEndsSummary(earliest, undefined);
    }
    const counts = groups.map(g => g.repeat?.count).filter((c): c is number => c != null);
    if (counts.length > 0) {
      return formatEndsSummary(undefined, Math.min(...counts));
    }
    return '';
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

  // Schedule/My Reminder's own staged fields reset themselves now (see ScheduleEditDialogs' own
  // resetStagedFields) — this only ever needs to cover Icon/Tags, the two dialogs still owned here.
  const resetModalStates = () => {
    setTempIcon(checklistTemplate.avatar?.name || '');
    setTempColor(checklistTemplate.avatar?.color || '#607d8b');
    setTempTags(checklistTemplate.tags || []);
  };

  const handleModalClose = () => {
    resetModalStates();
    setActiveModal(EditModal.None);
  };

  return (
    <>
      <SettingsCard>
        <SettingsRow
          // A plain settings icon, not the task's own avatar — that's already shown once, in
          // the page's own breadcrumb header right above this card; repeating it here just
          // read as the task's icon changing, not as "this is the settings section."
          logo={<Icon width={24} icon="solar:settings-linear" />}
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
            {/* Schedule — Start/End Date and "how often" used to be two separate rows/dialogs
                (Start & End Date, Schedule), split specifically so a buried end date would stay
                visible. Merged back into one now: a field-group template's per-group schedules
                (each with their own end date/time — GroupScheduleList) made the two-row split
                actively misleading, showing a template-level "No end date" right next to a
                separately-synthesized real per-group end summary. One row, one dialog — Start
                Date up top (still template-level, see StartEndDateFields), everything about "how
                often" below it. */}
            <SettingsRow
              logo={<Icon width={24} icon="solar:calendar-date-line-duotone" />}
              title="Schedule"
              description={
                <>
                  <span>
                    {formatDisplayStartEndDate() ||
                      intl.formatMessage({
                        id: 'checklist-generic-info.start-date-description',
                        defaultMessage: 'Start of the task',
                      })}
                  </span>
                  <br />
                  <span>
                    {/* The merged union of every group's own days (WeekDaysPills, read-only
                        summary — the modal's GroupScheduleList is where each group's own days
                        actually get edited) rather than a comma-separated list. */}
                    {hasFieldGroups ? (
                      <>
                        <WeekDaysPills
                          activeDays={getDaysFromRepeat({
                            byday: getEffectiveDayOfWeek(checklistTemplate) ?? ALL_ICAL_DAYS,
                          })}
                        />
                        {formatDisplayGroupEnds() && ` • ${formatDisplayGroupEnds()}`}
                      </>
                    ) : (
                      <>
                        {formatDisplayDays()}
                        {formatDisplayCount() && ` • ${formatDisplayCount()}`}
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
                    )}
                  </span>
                </>
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
                onClick={onDelete}
              />
            )}
          </div>
        </motion.div>
      </SettingsCard>

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

      <ScheduleEditDialogs
        checklistTemplate={checklistTemplate}
        onUpdate={onUpdate}
        onSplitSchedule={onSplitSchedule}
        readOnly={readOnly}
        onUpdateMyReminder={onUpdateMyReminder}
        checklist={checklist}
        onUpdateChecklist={onUpdateChecklist}
        mode={
          activeModal === EditModal.Schedule ? 'schedule' : activeModal === EditModal.MyReminder ? 'myReminder' : null
        }
        onClose={() => setActiveModal(EditModal.None)}
      />

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
    </>
  );
};

export default ChecklistGenericInfo;
