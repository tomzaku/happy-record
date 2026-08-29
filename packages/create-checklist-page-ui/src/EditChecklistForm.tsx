import React, { startTransition } from 'react';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import { useChecklistTemplates, useChecklist, useFieldGroups } from '@dreamer/global';
import { useNavigate, useParams } from 'react-router-dom';
import CoreChecklistForm, { FormState } from './CoreChecklistForm';
import { calculateRepeat } from './calculateRepeat';
import { getDaysFromRepeat } from './getDayFromRepeat';
import { BackHeader } from '@dreamer/header';
import { useIntl } from '@dreamer/translation';

const EditChecklistForm = () => {
  const { checklistTemplate, deleteChecklistTemplate } =
    useChecklistTemplates();
  const { getAllChecklistWithTemplate, deleteChecklist } = useChecklist();
  const { id } = useParams<{ id: string }>();
  const template = checklistTemplate[id || ''];
  const { updateChecklistTemplate } = useChecklistTemplates();
  // `fieldGroups` isn't part of the template's own row anymore — a schedule edit made via
  // GroupScheduleList (the only thing this form's own fieldGroups field ever changes; see that
  // component's own doc comment) is its own write now, one row at a time.
  const { updateFieldGroup } = useFieldGroups();
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
    tags,
  }: FormState) => {
    const repeat = calculateRepeat({ weeklyHobbies, selectedTime, startedAt });
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
      fieldGroups: template.fieldGroups,
      tags,
    });
    (fieldGroups ?? []).forEach(group => {
      const original = template.fieldGroups.find(g => g.id === group.id);
      if (original && JSON.stringify(group) !== JSON.stringify(original)) {
        updateFieldGroup(group);
      }
    });
    navigate('/');
  };
  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const handleDelete = () => {
    setDeleteModalVisible(true);
  };
  const handleDeleteChecklistTemplate = async (checklistTemplateId: string, includedAllChecklist: boolean) => {
    // Delete the checklist template
    deleteChecklistTemplate(checklistTemplateId);

    // If includedAllChecklist is true, delete every checklist instance
    // (day) created from this template — a real server-side delete now
    // (DELETE /checklists?id=), not just a local removal.
    if (includedAllChecklist) {
      const checklistsToDelete = await getAllChecklistWithTemplate(checklistTemplateId);
      checklistsToDelete.forEach(checklistItem => {
        deleteChecklist(checklistItem.id);
      });
    }

    setDeleteModalVisible(false);
    navigate('/');
  };

  const confirmDelete = () => {
    if (id) {
      handleDeleteChecklistTemplate(id, true);
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
        content={intl.formatMessage({
          id: 'ChecklistTemplate.delete-confirm-message',
          defaultMessage:
            'Are you sure you want to delete this checklist template? This action cannot be undone.',
        })}
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
          tags: template.tags || [],
        }}
      />
    </>
  );
};

export default EditChecklistForm;
