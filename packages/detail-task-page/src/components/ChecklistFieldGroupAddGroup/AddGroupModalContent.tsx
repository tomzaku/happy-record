import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Button from '@moon-ui/button';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import { useIntl } from '@dreamer/translation';
import { RecordField } from '@dreamer/global';
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
}: AddGroupModalContentProps) => {
  const intl = useIntl();
  console.log("SELECTED FIELDS", selectedFields)

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

  const handleSelectAll = () => {
    if (selectedFields.length === availableFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields([...availableFields]);
    }
  };

  const isFormValid = groupName.trim().length > 0 && selectedFields.length > 0;

  return (
    <div className={styles.modalContent}>
      <div className={styles.header}>
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

      <div className={styles.content}>
        <div className={styles.section}>
          <Typography.Text className={styles.sectionTitle}>
            {intl.formatMessage({
              defaultMessage: 'Group Name',
              id: 'label-group-name',
            })}
          </Typography.Text>
          <Input
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            placeholder={intl.formatMessage({
              defaultMessage: 'Enter group name...',
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
              onClick={handleSelectAll}
              className={styles.selectAllButton}
              type="ghost"
            >
              {selectedFields.length === availableFields.length
                ? intl.formatMessage({
                    defaultMessage: 'Deselect All',
                    id: 'label-deselect-all',
                  })
                : intl.formatMessage({
                    defaultMessage: 'Select All',
                    id: 'label-select-all',
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
                return (
                  <div key={fieldId} className={styles.fieldItem}>
                    <Checkbox
                      checked={selectedFields.includes(fieldId)}
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
  );
};

export default AddGroupModalContent;
