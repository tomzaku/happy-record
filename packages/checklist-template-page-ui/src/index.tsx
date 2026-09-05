import React from 'react';
import Card from '@moon-ui/card';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import WarningModal from '@moon-ui/modal/src/WarningModal';

import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import { useNavigate } from 'react-router-dom';

import cn from 'classnames';
import styles from './index.module.scss';
import { BackHeader } from '@dreamer/header';

const ChecklistTemplatePageUi = () => {
  const {
    getRecommendChecklistTemplates,
    selectedChecklistTemplates,
    selectChecklistTemplate,
    deselectChecklistTemplate,
    deleteChecklistTemplate,
  } = useChecklistTemplates();
  const { getAllChecklistWithTemplate, deleteChecklist } = useChecklist();
  const intl = useIntl();
  const navigate = useNavigate();
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [templateToDelete, setTemplateToDelete] = React.useState<string | null>(
    null,
  );

  const getRepeatText = (repeat?: { dayOfWeek: string }) => {
    const text = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const days = repeat?.dayOfWeek?.split(',') || [];
    if (days.includes('*')) {
      return [
        {
          enabled: true,
          text: intl.formatMessage({
            id: 'PregnantIntro.repeat.everyday',
            defaultMessage: 'Every day',
          }),
        },
      ];
    }
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      return {
        day: i,
        enabled: days.includes(i.toString()) || days.includes('*'),
        text: intl.formatMessage({
          id: `PregnantIntro.repeat.${i}`,
          defaultMessage: text[i],
        }),
      };
    });
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      deleteChecklistTemplate(templateToDelete);
      // Without this, a Checklist instance already generated for this
      // template keeps showing on the home page — its checklistTemplateId
      // no longer resolves to anything, but computeChecklistsForDate treats
      // that as "unscheduled" rather than excluding it. Mirrors
      // EditChecklistForm's own delete-with-instances flow.
      const checklistsToDelete = await getAllChecklistWithTemplate(templateToDelete);
      checklistsToDelete.forEach(checklistItem => deleteChecklist(checklistItem.id));
      setDeleteModalVisible(false);
      setTemplateToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    setTemplateToDelete(null);
  };

  return (
    <div className={styles.pageContainer}>
      <BackHeader
        renderLeftComponent={() =>
          intl.formatMessage({
            id: 'ChecklistTemplatePageInfo.back',
            defaultMessage: 'Back',
          })
        }
      />
      <Card className={styles.card}>
        <>
          <p className={styles.label}>
            {intl.formatMessage({
              id: 'PregnantIntro.checklists-management',
              defaultMessage: 'Checklist Template Management',
            })}
          </p>
          {getRecommendChecklistTemplates().map(
            ({ id, title, avatar, repeat }) => (
              <div key={id} className={styles.checklistTemplateContainer}>
                <div className={styles.checklistItem}>
                  <Icon
                    color={avatar.color || '#8A8A8A'}
                    width={32}
                    height={32}
                    icon={avatar.name}
                  />
                  <div className={styles.checklistBody}>
                    <Typography.Text className={styles.text}>
                      {title}
                    </Typography.Text>
                  </div>
                  <Icon
                    className={styles.editIcon}
                    width={24}
                    height={24}
                    icon="material-symbols:edit-outline"
                    onClick={() => navigate(`/edit-checklist/${id}`)}
                  />
                  <Icon
                    className={styles.deleteIcon}
                    width={24}
                    height={24}
                    icon="material-symbols:delete-outline"
                    onClick={() => handleDelete(id)}
                  />
                  <Checkbox
                    checked={selectedChecklistTemplates.includes(id)}
                    onChange={event =>
                      event.target.checked ? selectChecklistTemplate(id) : deselectChecklistTemplate(id)
                    }
                    className={styles.checkbox}
                  />
                </div>
                <div className={styles.footer}>
                  {getRepeatText(repeat).map(({ enabled, text }) => (
                    <Typography.Text
                      key={text}
                      className={cn(styles.text, { [styles.enabled]: enabled })}
                    >
                      {text}
                    </Typography.Text>
                  ))}
                </div>
              </div>
            ),
          )}
        </>
      </Card>
      <WarningModal
        visible={deleteModalVisible}
        title={intl.formatMessage({
          id: 'ChecklistTemplate.delete-confirm-title',
          defaultMessage: 'Delete Checklist Template',
        })}
        primaryButtonText={intl.formatMessage({
          id: 'ChecklistTemplate.delete-confirm-ok',
          defaultMessage: 'Delete',
        })}
        primaryButtonOnClick={confirmDelete}
        secondaryButtonText={intl.formatMessage({
          id: 'ChecklistTemplate.delete-confirm-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={handleCancelDelete}
        content={
          <Typography.Text>
            {intl.formatMessage({
              id: 'ChecklistTemplate.delete-confirm-message',
              defaultMessage:
                'Are you sure you want to delete this checklist template? This action cannot be undone.',
            })}
          </Typography.Text>
        }
      />
    </div>
  );
};

export default ChecklistTemplatePageUi;
