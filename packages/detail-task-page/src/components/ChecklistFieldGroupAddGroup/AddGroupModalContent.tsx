import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Checkbox from '@moon-ui/checkbox';
import Input from '@moon-ui/input';
import { useIntl } from '@dreamer/translation';
import { RecordField } from '@dreamer/global';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';
import styles from './AddGroupModalContent.module.scss';

interface AddGroupModalContentProps {
  groupName: string;
  setGroupName: (name: string) => void;
  selectedFields: string[];
  setSelectedFields: (fields: string[]) => void;
  availableFields: string[];
  allRecordFields: RecordField[];
  onSave: () => void;
  onCancel: () => void;
  onFieldAdded?: (newField: RecordField) => void;
}

const AddGroupModalContent = ({
  groupName,
  setGroupName,
  selectedFields,
  setSelectedFields,
  availableFields,
  allRecordFields,
  onSave,
  onCancel,
  onFieldAdded,
}: AddGroupModalContentProps) => {
  const intl = useIntl();
  const [isAddFieldPanelVisible, setIsAddFieldPanelVisible] = React.useState(false);
  
  const handleFieldToggle = (fieldId: string) => {
    const newSelectedFields = selectedFields.includes(fieldId)
      ? selectedFields.filter(id => id !== fieldId)
      : [...selectedFields, fieldId];
    setSelectedFields(newSelectedFields);
  };

  // Get field display info
  const getFieldDisplayInfo = (fieldId: string) => {
    const field = allRecordFields.find(f => f.id === fieldId);
    return field ? { title: field.title, icon: field.icon } : { title: fieldId, icon: 'solar:document-linear' };
  };

  const handleAddField = () => {
    setIsAddFieldPanelVisible(true);
  };

  const handleFieldPanelClose = () => {
    setIsAddFieldPanelVisible(false);
  };

  const handleFieldPanelSubmit = (newField: RecordField) => {
    onFieldAdded?.(newField);
    setIsAddFieldPanelVisible(false);
  };

  const isFormValid = groupName.trim().length > 0 && selectedFields.length > 0;

  return (
    <div className={styles.modalContainer}>
      <div className={styles.modalContent}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <Typography.Title level={4} noMargin>
            {intl.formatMessage({
              defaultMessage: 'Create New Group',
              id: 'label-create-new-group',
            })}
          </Typography.Title>
          <Icon
            onClick={onCancel}
            width={20}
            icon="basil:close-outline"
            className={styles.closeIcon}
          />
        </div>
        <Typography.Text className={styles.headerDescription}>
          {intl.formatMessage({
            defaultMessage:
              "A group bundles a few fields so they're recorded together as one section — like Duration + Distance under \"Cardio\", or Push-ups + Pull-ups under \"Strength\".",
            id: 'label-create-new-group-description',
          })}
        </Typography.Text>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <Typography.Text className={styles.sectionTitle}>
            {intl.formatMessage({
              defaultMessage: 'Group Name',
              id: 'label-group-name',
            })}
          </Typography.Text>
          <Typography.Text className={styles.sectionDescription}>
            {intl.formatMessage({
              defaultMessage: "What these fields have in common — you'll see this as the section heading.",
              id: 'label-group-name-description',
            })}
          </Typography.Text>
          <Input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder={intl.formatMessage({
              defaultMessage: 'e.g. Cardio, Strength, Morning Routine',
              id: 'placeholder-group-name',
            })}
            className={styles.nameInput}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionTitle}>
              {intl.formatMessage({
                defaultMessage: 'Select Fields',
                id: 'label-select-fields',
              })}
            </Typography.Text>
            <Button
              onClick={handleAddField}
              className={styles.addFieldButton}
              type="ghost"
            >
              <Icon width={16} icon="fe:plus"  />
              {intl.formatMessage({
                defaultMessage: 'Add Field',
                id: 'label-add-field',
              })}
            </Button>
          </div>

          <div className={styles.fieldsList}>
            {availableFields.length === 0 ? (
              <div className={styles.emptyState}>
                <Icon
                  width={48}
                  icon="solar:folder-open-line-duotone"
                  className={styles.emptyIcon}
                />
                <Typography.Text className={styles.emptyText}>
                  {intl.formatMessage({
                    defaultMessage: 'No fields available',
                    id: 'label-no-fields-available',
                  })}
                </Typography.Text>
              </div>
            ) : (
              availableFields.map(fieldId => {
                const { title, icon } = getFieldDisplayInfo(fieldId);
                const isChecked = selectedFields.includes(fieldId);
                return (
                  <div key={fieldId} className={styles.fieldItem}>
                    <Checkbox
                      key={`${fieldId}-${isChecked}`}
                      checked={isChecked}
                      onChange={() => handleFieldToggle(fieldId)}
                      className={styles.fieldCheckbox}
                    />
                    <Icon width={16} icon={icon} className={styles.fieldIcon} />
                    <Typography.Text className={styles.fieldLabel}>
                      {title}
                    </Typography.Text>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          onClick={onCancel}
          className={styles.cancelButton}
          type="ghost"
        >
          {intl.formatMessage({
            defaultMessage: 'Cancel',
            id: 'label-cancel',
          })}
        </Button>
        <Button
          onClick={onSave}
          className={styles.saveButton}
          type="primary"
          disabled={!isFormValid}
        >
          {intl.formatMessage({
            defaultMessage: 'Create Group',
            id: 'label-create-group',
          })}
        </Button>
      </div>
      </div>

      {isAddFieldPanelVisible && (
        <div className={styles.addFieldPanel}>
          <div className={styles.addFieldPanelHeader}>
            <Typography.Title level={4} noMargin>
              {intl.formatMessage({
                defaultMessage: 'Add New Field',
                id: 'label-add-new-field',
              })}
            </Typography.Title>
            <Icon
              onClick={handleFieldPanelClose}
              width={20}
              icon="basil:close-outline"
              className={styles.closeIcon}
            />
          </div>
          <div className={styles.addFieldPanelContent}>
            <AddFieldRecordUi
              onSubmit={handleFieldPanelSubmit}
              onCancel={handleFieldPanelClose}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AddGroupModalContent;
