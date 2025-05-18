import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@iconify/react';
import Checkbox from '@moon-ui/checkbox';
import styles from './index.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';

const ChecklistToday = ({ date }: { date: Date }) => {
  const {
    checklistByGivingDateIds,
    allChecklist,
    getChecklistByGivingDate,
    updateChecklist,
  } = useChecklist();
  const { checklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();

  React.useEffect(() => {
    getChecklistByGivingDate({ date });
  }, [date]);

  return (
    <div className={styles.container}>
      {checklistByGivingDateIds.map((id, index) => {
        const currentChecklist = allChecklist[id];
        const currentChecklistTemplate =
          checklistTemplate[currentChecklist.checklistTemplateId];
        return (
          <div
            key={id}
            className={cx(
              styles.checklistItem,
              index === checklistByGivingDateIds.length - 1 &&
                styles.lastChecklistItem
            )}
          >
            <Icon
              color={currentChecklistTemplate?.avatar.color || '#8A8A8A'}
              width={32}
              height={32}
              icon={currentChecklistTemplate?.avatar.name}
            />
            <Typography.Text className={styles.title}>
              {currentChecklist?.title}
            </Typography.Text>
            <Icon
              className={styles.editIcon}
              width={24}
              height={24}
              icon="material-symbols:edit-outline"
              onClick={() => navigate(`/edit-checklist/${currentChecklist.checklistTemplateId}`)}
            />
            <Checkbox
              checked={Boolean(currentChecklist?.completedAt)}
              className={styles.checkbox}
              onChange={event => {
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
    </div>
  );
};

export default ChecklistToday;
