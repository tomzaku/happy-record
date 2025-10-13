import React from 'react';
import {
  Checklist,
  useChecklist,
  useChecklistTemplates,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import styles from './index.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import AddInlineTask from '../AddInlineTask';

const ChecklistToday = ({ date, selectedTag }: { date: Date; selectedTag?: string }) => {
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
      <div>
        <div className={styles.emptyContainer}>
          <Icon
            width={80}
            // color="#00000024"
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({
              id: 'ChecklistToday.no-record',
              defaultMessage: 'No tasks found!',
            })}
          </Typography.Title>
          <AddInlineTask
            onTaskCreated={() => {
              // Refresh the checklist data when a new task is created
              const { checklist, checklistIds } = getChecklistByGivingDate({ date, selectedTag });
              setChecklist(checklist);
              setChecklistByGivingDateIds(checklistIds);
            }}
            className={styles.addTaskButton}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {checklistByGivingDateIds.map((id, index) => {
        const currentChecklist = checklist[id];
        const currentChecklistTemplate =
          checklistTemplate[currentChecklist.checklistTemplateId];
        return (
          <div
            key={id}
            className={cx(
              styles.checklistItem,
              index === checklistByGivingDateIds.length - 1 &&
                styles.lastChecklistItem,
            )}
          >
            <Icon
              color={currentChecklistTemplate?.avatar.color || '#8A8A8A'}
              width={32}
              height={32}
              icon={currentChecklistTemplate?.avatar.name}
            />
            <Typography.Text
              onClick={() => {
                const baseUrl = `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}`;
                const checklistIdParam = currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`;
                navigate(baseUrl + checklistIdParam);
              }}
              className={styles.title}
            >
              {currentChecklistTemplate?.title}
            </Typography.Text>
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
        );
      })}
      <AddInlineTask
        onTaskCreated={() => {
          // Refresh the checklist data when a new task is created
          const { checklist, checklistIds } = getChecklistByGivingDate({ date, selectedTag });
          setChecklist(checklist);
          setChecklistByGivingDateIds(checklistIds);
        }}
        className={styles.addTaskButtonBottom}
      />
    </div>
  );
};

export default ChecklistToday;
