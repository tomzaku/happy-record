import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import styles from './ChecklistToday.desktop.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import Button from '@moon-ui/button/src/DefaultButton';
import Card from '@moon-ui/card';
import { format } from 'date-fns';
import CreateTaskModal from '../create-task-modal';
import AddInlineTask from '../AddInlineTask';

// Temporary local utility function - will be moved to global utils later
const formatSchedule = (repeat?: {
  hour: string;
  minute: string;
  dayOfWeek: string;
}): string => {
  if (!repeat || !repeat.dayOfWeek) {
    return 'No schedule';
  }

  const time = `${repeat.hour.padStart(2, '0')}:${repeat.minute.padStart(2, '0')}`;
  const days = formatDaysOfWeek(repeat.dayOfWeek);

  return `${time} • ${days}`;
};

const formatDaysOfWeek = (dayOfWeek: string): string => {
  if (!dayOfWeek || dayOfWeek === '*') {
    return 'Every day';
  }

  const dayNumbers = dayOfWeek.split(',');
  if (dayNumbers.length === 7) {
    return 'Every day';
  }

  const dayNames = {
    '0': 'Sun',
    '1': 'Mon',
    '2': 'Tue',
    '3': 'Wed',
    '4': 'Thu',
    '5': 'Fri',
    '6': 'Sat',
  };

  const formattedDays = dayNumbers.map(
    day => dayNames[day as keyof typeof dayNames] || day,
  );
  return formattedDays.join(', ');
};

const ChecklistTodayDesktop = ({
  date,
  selectedTag,
}: {
  date: Date;
  selectedTag?: string;
}) => {
  const { getChecklistByGivingDate, updateChecklist } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();
  const intl = useIntl();

  // `getChecklistByGivingDate` is itself a `useCallback` chain rooted in
  // `checklist`/`checklistTemplate`/`selectedChecklistTemplates` (see
  // useChecklists.tsx), so depending on the function directly here — not
  // hand-picking which underlying pieces "should" matter — is what makes
  // this recompute on every relevant change, `selectedChecklistTemplates`
  // included. The previous version snapshotted this into local state from
  // a `useEffect` keyed on `[date, selectedTag, checklistTemplate]`, which
  // never mentioned `selectedChecklistTemplates` at all: a template synced
  // in for the first time updates that list a beat after `checklistTemplate`
  // itself (see useChecklistTemplates.tsx), a change this component had no
  // way to notice — it would show "No tasks found!" while the weekly
  // calendar right next to it (already `useMemo`'d the same way this now
  // is) correctly showed the same task. `AddInlineTask`'s manual re-fetch
  // after creating a task is gone too — creating one already updates the
  // same underlying state, so this recomputes on its own.
  const { checklist, checklistIds: checklistByGivingDateIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  if (checklistByGivingDateIds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyBody}>
          <Icon
            width={80}
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({
              id: 'ChecklistToday.no-record',
              defaultMessage: 'No tasks found!',
            })}
          </Typography.Title>
          <Typography.Text className={styles.emptyDescription}>
            Create your first task to get started with your daily routine.
          </Typography.Text>
        </div>
        <AddInlineTask className={styles.quickAddTask} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={4} className={styles.dateTitle}>
          {format(date, 'EEEE, MMMM d')}
        </Typography.Title>
        <Typography.Text className={styles.taskCount}>
          {checklistByGivingDateIds.length} task
          {checklistByGivingDateIds.length !== 1 ? 's' : ''}
        </Typography.Text>
      </div>

      <div className={styles.tasksList}>
        {checklistByGivingDateIds.map(id => {
          const currentChecklist = checklist[id];
          const currentChecklistTemplate =
            checklistTemplate[currentChecklist.checklistTemplateId];

          return (
            <Card
              key={id}
              className={cx(
                styles.taskCard,
                currentChecklist?.completedAt && styles.completedTask,
              )}
              onClick={() =>
                navigate(
                  `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
                )
              }
            >
              <div className={styles.taskHeader}>
                <div className={styles.taskIcon}>
                  <Icon
                    color={currentChecklistTemplate?.avatar.color || '#8A8A8A'}
                    width={24}
                    height={24}
                    icon={currentChecklistTemplate?.avatar.name}
                  />
                </div>
                <div className={styles.taskInfo}>
                  <div className={styles.taskTitleContainer}>
                    <Typography.Title
                      level={5}
                      className={styles.taskTitle}
                      noMargin
                    >
                      {currentChecklist?.title || currentChecklistTemplate?.title}
                    </Typography.Title>
                    {currentChecklistTemplate?.tags &&
                      currentChecklistTemplate.tags.length > 0 && (
                        <div className={styles.tagsContainer}>
                          {currentChecklistTemplate.tags.map(tag => (
                            <span key={tag} className={styles.tag}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className={styles.taskMeta}>
                    <div className={styles.schedule}>
                      <Icon
                        icon="solar:calendar-date-line-duotone"
                        width={16}
                        className={styles.metaIcon}
                      />
                      <Typography.Text className={styles.metaText}>
                        {formatSchedule(currentChecklistTemplate?.repeat)}
                      </Typography.Text>
                    </div>
                  </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <Checkbox
                    defaultChecked={Boolean(currentChecklist?.completedAt)}
                    className={styles.checkbox}
                    onChange={event => {
                      event.stopPropagation();
                      updateChecklist({
                        ...currentChecklist,
                        completedAt: event.target.checked
                          ? new Date().toISOString()
                          : undefined,
                      });
                    }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Add Task */}
      <AddInlineTask className={styles.quickAddTask} />
    </div>
  );
};

export default ChecklistTodayDesktop;
