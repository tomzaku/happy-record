import React from 'react';
import cx from 'classnames';
import { CalendarEvent } from '@dreamer/calendar-view';
import { useIntl } from '@dreamer/translation';
import { format } from 'date-fns';
import { Modal, BottomModal } from '@moon-ui/modal';
import Card from '@moon-ui/card';
import Button from '@moon-ui/button';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import { useIsMobile, isRecurringSchedule } from '@dreamer/global';
import ChecklistFieldGroupAdd from '@dreamer/detail-task-page/src/components/ChecklistFieldGroupAdd';
import ScheduleEditDialogs from '@dreamer/detail-task-page/src/components/ChecklistGenericInfo/ScheduleEditDialogs';
import FieldGroupNotePreview from '@happy-record/checklist-template-shared-page-ui/src/components/task-shared-card/FieldGroupNotePreview';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import { formatTemplateSchedule, getScheduledTimeLabel } from '../checklist-day/checklistDayHelpers';
import DeleteTaskModal from '../checklist-day/DeleteTaskModal';
import { useTaskDetailModalData } from './useTaskDetailModalData';
import { useTaskDetailDeleteFlow } from './useTaskDetailDeleteFlow';
import TaskOptionsMenu from './TaskOptionsMenu';
import styles from './TaskDetailModal.module.scss';

type Props = {
  event: CalendarEvent | null;
  onClose: () => void;
  onViewDetails: (data: CalendarEventData) => void;
};

// A clicked event on the home page's own calendar (HomeCalendar) used to jump straight to
// `/task/:id` — a click there is often just "what is this," not "take me to the edit page," so
// this shows a quick-look summary first: the day/schedule/status plus that field group's own note
// (if it has one) in the left `.info` column, and the real submit form (`ChecklistFieldGroupAdd`,
// the same one the full detail page uses) in the right `.submit` column, desktop only, so a
// record can be logged without leaving the calendar. The detail page stays one button away via
// `onViewDetails` for anything this quick-look doesn't cover (managing fields, the template's own
// settings, ...).
const TaskDetailModal = ({ event, onClose, onViewDetails }: Props) => {
  const intl = useIntl();
  const isMobile = useIsMobile();
  const data = event?.data as CalendarEventData | undefined;
  const {
    template,
    relevantGroups,
    fieldsByGroup,
    checklist,
    markCompleted,
    setCalendarColor,
    updateChecklistTemplate,
    splitChecklistTemplate,
    updateMyReminder,
    isOwnedTemplate,
  } = useTaskDetailModalData(data);
  const [scheduleEditOpen, setScheduleEditOpen] = React.useState(false);
  const isOwner = template ? isOwnedTemplate(template.id) : true;
  const {
    deletingTaskId,
    deletingTaskTitle,
    openDelete,
    cancelDelete,
    handleDeleteToday,
    handleDeleteThisAndFollowing,
    handleDeleteAll,
    eventChecklistId,
  } = useTaskDetailDeleteFlow(data);

  if (!event || !data) return null;

  // Any scope of delete removes the event this modal is showing — close it along with the
  // confirm modal rather than leaving a now-deleted (or now-truncated) event on screen.
  const withCloseOnDelete = (handler: () => void) => () => {
    handler();
    onClose();
  };

  const timeLabel = getScheduledTimeLabel(template);
  const showGroupLabels = relevantGroups.length > 1;
  const groupsWithNotes = relevantGroups.filter(group => group.noteId);
  const showSubmit = Boolean(template && checklist && relevantGroups.length > 0);

  const content = (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <div className={styles.badge}>
            <Icon width={18} icon={template?.avatar.name || 'solar:checklist-line-duotone'} color="#fff" />
          </div>
          <Typography.Title level={4} noMargin>
            {event.title}
          </Typography.Title>
        </div>
        <div className={styles.headerActions}>
          <TaskOptionsMenu
            colorValue={template?.calendarColor}
            onColorChange={setCalendarColor}
            onEditScheduleClick={() => setScheduleEditOpen(true)}
            onRemoveClick={() => eventChecklistId && openDelete(eventChecklistId)}
          />
          <Button type="primary" size="sm" className={styles.viewButton} onClick={() => onViewDetails(data)}>
            {intl.formatMessage({ id: 'home-calendar.view-details', defaultMessage: 'View details' })}
          </Button>
          <Icon onClick={onClose} width={20} icon="basil:close-outline" className={styles.closeIcon} />
        </div>
      </div>

      <div className={cx(styles.body, showSubmit && styles.twoColumn)}>
        <div className={styles.info}>
          <div className={styles.row}>
            <Icon width={16} icon="solar:calendar-line-duotone" className={styles.rowIcon} />
            <Typography.Text>
              {format(data.date, 'EEEE, MMM d')}
              {timeLabel ? ` • ${timeLabel}` : ''}
            </Typography.Text>
          </div>
          <div className={styles.row}>
            <Icon width={16} icon="solar:repeat-line-duotone" className={styles.rowIcon} />
            <Typography.Text>{formatTemplateSchedule(template)}</Typography.Text>
          </div>
          <div className={styles.row}>
            <Icon
              width={16}
              icon={event.done ? 'solar:check-circle-bold' : 'solar:clock-circle-line-duotone'}
              className={styles.rowIcon}
              color={event.done ? '#27ae60' : undefined}
            />
            <Typography.Text>
              {event.done
                ? intl.formatMessage({ id: 'home-calendar.status-done', defaultMessage: 'Completed' })
                : intl.formatMessage({ id: 'home-calendar.status-pending', defaultMessage: 'Not completed yet' })}
            </Typography.Text>
          </div>

          {groupsWithNotes.length > 0 && (
            <div className={styles.notesSection}>
              {/* Same read-only note preview the challenge invite page shows a prospective
                  joiner before they sign up (task-shared-card's own FieldGroupNotePreview) —
                  it already renders the group's own title and self-hides when a group has no
                  note, so this needs no title/visibility wrapper of its own. */}
              {relevantGroups.map(group => (
                <FieldGroupNotePreview key={group.id} fieldGroup={group} />
              ))}
            </div>
          )}
        </div>

        {template && checklist && relevantGroups.length > 0 && (
          <div className={styles.submit}>
            {relevantGroups.map(group => (
              <Card key={group.id} className={styles.groupCard}>
                {showGroupLabels && <Typography.Text className={styles.groupTitle}>{group.title}</Typography.Text>}
                <ChecklistFieldGroupAdd
                  fields={fieldsByGroup[group.id] ?? []}
                  checklistTemplate={template}
                  fieldGroup={group}
                  checklist={checklist}
                  currentDay={data.date.toISOString()}
                  onSubmit={markCompleted}
                  compact
                />
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <BottomModal
          visible={Boolean(event)}
          onDismiss={onClose}
          content={<div className={styles.mobileSheet}>{content}</div>}
        />
      ) : (
        <Modal visible={Boolean(event)} onDismiss={onClose} content={content} className={styles.modalShell} />
      )}
      <DeleteTaskModal
        visible={Boolean(deletingTaskId)}
        taskTitle={deletingTaskTitle || event.title}
        isRecurring={isRecurringSchedule(template?.repeat)}
        onDeleteToday={withCloseOnDelete(handleDeleteToday)}
        onDeleteThisAndFollowing={withCloseOnDelete(handleDeleteThisAndFollowing)}
        onDeleteAll={withCloseOnDelete(handleDeleteAll)}
        onCancel={cancelDelete}
      />
      {/* Same Schedule/My Reminder editor ChecklistGenericInfo uses on the full detail page — see
          ScheduleEditDialogs' own doc comment — so "Edit schedule" from this quick-look modal
          updates the template right here instead of navigating away. `template` is only known
          once the calendar's own fetch resolves; nothing to edit before then. */}
      {template && (
        <ScheduleEditDialogs
          checklistTemplate={template}
          onUpdate={updateChecklistTemplate}
          onSplitSchedule={isOwner ? (from, repeat) => splitChecklistTemplate(template, from, repeat) : undefined}
          onUpdateMyReminder={!isOwner ? repeat => updateMyReminder(template.id, repeat) : undefined}
          readOnly={!isOwner}
          mode={scheduleEditOpen ? (isOwner ? 'schedule' : 'myReminder') : null}
          onClose={() => setScheduleEditOpen(false)}
        />
      )}
    </>
  );
};

export default TaskDetailModal;
