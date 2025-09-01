import React from 'react';
import {
  Checklist,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
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

// Temporary local utility function - will be moved to global utils later
const formatSchedule = (repeat?: { hour: string; minute: string; dayOfWeek: string }): string => {
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
    '6': 'Sat'
  };

  const formattedDays = dayNumbers.map(day => dayNames[day as keyof typeof dayNames] || day);
  return formattedDays.join(', ');
};

const ChecklistTodayDesktop = ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
  const { getChecklistByGivingDate, updateChecklist } = useChecklist();
  const [checklistByGivingDateIds, setChecklistByGivingDateIds] =
    React.useState<string[]>([]);
  const { checklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();
  const [checklist, setChecklist] = React.useState<Record<string, Checklist>>(
    {},
  );
  const intl = useIntl();

  React.useEffect(() => {
    const { checklist, checklistIds } = getChecklistByGivingDate({ date, selectedTag });
    setChecklist(checklist);
    setChecklistByGivingDateIds(checklistIds);
  }, [date, selectedTag]);

  if (checklistByGivingDateIds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
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
        <Button
          type="ghost"
          onClick={() => {
            navigate('/create-checklist');
          }}
          className={styles.addTaskButton}
        >
          Create Task
        </Button>
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
          {checklistByGivingDateIds.length} task{checklistByGivingDateIds.length !== 1 ? 's' : ''}
        </Typography.Text>
      </div>

      <div className={styles.tasksList}>
        {checklistByGivingDateIds.map((id, index) => {
          const currentChecklist = checklist[id];
          const currentChecklistTemplate =
            checklistTemplate[currentChecklist.checklistTemplateId];

          return (
            <Card
              key={id}
              className={cx(
                styles.taskCard,
                currentChecklist?.completedAt && styles.completedTask
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
                  <Typography.Title
                    level={5}
                    className={styles.taskTitle}
                  >
                    {currentChecklistTemplate?.title}
                  </Typography.Title>
                  <div className={styles.taskMeta}>
                    <div className={styles.schedule}>
                      <Icon icon="solar:clock-circle" width={16} className={styles.metaIcon} />
                      <Typography.Text className={styles.metaText}>
                        {formatSchedule(currentChecklistTemplate?.repeat)}
                      </Typography.Text>
                    </div>
                    {currentChecklistTemplate?.tags && currentChecklistTemplate.tags.length > 0 && (
                      <div className={styles.tags}>
                        <Icon icon="solar:tag-price" width={16} className={styles.metaIcon} />
                        <div className={styles.tagsContainer}>
                          {currentChecklistTemplate.tags.map((tag, index) => (
                            <span key={index} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.taskActions}>
                  <Checkbox
                    defaultChecked={Boolean(currentChecklist?.completedAt)}
                    className={styles.checkbox}
                    onChange={event => {
                      event.stopPropagation();
                      event.preventDefault();
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

      <Button
        type="dash"
        size="lg"
        onClick={() => {
          navigate('/create-checklist');
        }}
        className={styles.addTaskButtonBottom}
      >
        <Icon icon="material-symbols:add" className={styles.addIcon} />
        Add Task
      </Button>
    </div>
  );
};

export default ChecklistTodayDesktop;
