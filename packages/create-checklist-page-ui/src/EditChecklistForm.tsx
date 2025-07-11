import React from 'react';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import Typography from '@moon-ui/typography';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { useNavigate, useParams } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { calculateRepeat } from './calculateRepeat';
import { getDay } from './getDay';
import { getDaysFromRepeat } from './getDayFromRepeat';
import { BackHeader } from '@dreamer/header';
import { useIntl } from '@dreamer/translation';

const EditChecklistForm = () => {
  const { checklistTemplate, deleteChecklistTemplate } =
    useChecklistTemplates();
  const { id } = useParams<{ id: string }>();
  const template = checklistTemplate[id || ''];
  const { updateChecklistTemplate } = useChecklistTemplates();
  const navigate = useNavigate();
  const intl = useIntl();
  const onSubmit = ({
    startedAt,
    selectedTime,
    selectedRecords,
    selectedColor,
    selectedIcon,
    checklistText,
    weeklyHobbies,
    fieldGroups,
  }: FormState) => {
    const repeat = calculateRepeat({ weeklyHobbies, selectedTime });
    updateChecklistTemplate({
      id: template.id,
      records: selectedRecords,
      title: checklistText,
      repeat,
      avatar: {
        type: 'icon',
        name: selectedIcon,
        color: selectedColor,
      },
      fieldGroups,
    });
    navigate('/');
  };
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const handleDelete = () => {
    setDeleteModalVisible(true);
  };
  const confirmDelete = () => {
    if (id) {
      deleteChecklistTemplate(id);
      setDeleteModalVisible(false);
      navigate('/');
    }
  };
  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
  };
  if (!template) return null;
  return (
    <>
      <BackHeader
        renderLeftComponent={() => <span>Edit Task</span>}
        onClickLeftButton={() => navigate('/')}
      />
      <WarningModal
        visible={deleteModalVisible}
        title={intl.formatMessage({
          id: 'EditChecklistTemplate.delete-confirm-title',
          defaultMessage: 'Delete Checklist Template',
        })}
        primaryButtonText={intl.formatMessage({
          id: 'EditChecklistTemplate..delete-confirm-ok',
          defaultMessage: 'Delete',
        })}
        primaryButtonOnClick={confirmDelete}
        secondaryButtonText={intl.formatMessage({
          id: 'EditChecklistTemplate..delete-confirm-cancel',
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
      <CoreChecklistForm
        onClickDeleteButton={handleDelete}
        onSubmit={onSubmit}
        initialValues={{
          selectedRecords: template.records,
          checklistText: template.title,
          weeklyHobbies: getDaysFromRepeat(template.repeat),
          startedAt: template?.repeat?.startedAt
            ? new Date(template.repeat.startedAt).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          selectedTime:
            template?.repeat?.hour && template?.repeat?.minute
              ? `${template.repeat.hour.padStart(2, '0')}:${template.repeat.minute.padStart(2, '0')}`
              : '',
          selectedIcon: template?.avatar?.name,
          selectedColor: template?.avatar?.color || '#607d8b',
          fieldGroups: template.fieldGroups,
        }}
      />
    </>
  );
};

export default EditChecklistForm;
