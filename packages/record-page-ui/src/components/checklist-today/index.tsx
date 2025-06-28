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
import Button from '@moon-ui/button/src/DefaultButton';

const ChecklistToday = ({ date }: { date: Date }) => {
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
    const { checklist, checklistIds } = getChecklistByGivingDate({ date });
    setChecklist(checklist);
    setChecklistByGivingDateIds(checklistIds);
  }, [date]);

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
              onClick={() =>
                navigate(
                  `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
                )
              }
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

export default ChecklistToday;
