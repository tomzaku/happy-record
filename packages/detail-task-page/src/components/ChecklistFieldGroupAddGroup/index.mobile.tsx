import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Button from '@moon-ui/button';
import { useIntl } from '@dreamer/translation';
import { FieldGroup, RecordField } from '@dreamer/global';
import styles from './index.mobile.module.scss';
import cx from 'classnames';
import AddGroupModalContent from './AddGroupModalContent';

interface ChecklistFieldGroupAddGroupMobileProps {
  fieldGroups?: FieldGroup[];
  onAddFieldGroup: (newGroup: FieldGroup) => void;
  availableFields?: string[];
  allRecordFields: RecordField[];
  onFieldAdded?: (newField: RecordField) => void;
}

const ChecklistFieldGroupAddGroupMobile = ({
  fieldGroups = [],
  onAddFieldGroup,
  availableFields = [],
  allRecordFields,
  onFieldAdded,
}: ChecklistFieldGroupAddGroupMobileProps) => {
  const intl = useIntl();
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  // Temporary state for modal editing
  const [tempGroupName, setTempGroupName] = React.useState('');
  const [tempSelectedFields, setTempSelectedFields] = React.useState<string[]>([]);

  const handleModalOpen = () => {
    setIsModalVisible(true);
    setTempGroupName('');
    setTempSelectedFields([]);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setTempGroupName('');
    setTempSelectedFields([]);
  };

  const handleSave = () => {
    if (tempGroupName.trim() && tempSelectedFields.length > 0) {
      const newGroup: FieldGroup = {
        id: `group-${Date.now()}`,
        title: tempGroupName.trim(),
        // No overrides on creation — Select Fields' own "Customize" panel (ChecklistFieldGroupMenu)
        // is where those get set, once the group actually exists.
        fields: tempSelectedFields.map(fieldId => ({ fieldId })),
        note: null,
        defaultTab: 0,
        activeTabs: [0, 1, 2, 3, 4],
        collapseDefault: false,
      };
      onAddFieldGroup(newGroup);
      handleModalClose();
    }
  };

  const modalContent = (
    <AddGroupModalContent
      groupName={tempGroupName}
      setGroupName={setTempGroupName}
      selectedFields={tempSelectedFields}
      setSelectedFields={setTempSelectedFields}
      availableFields={availableFields}
      allRecordFields={allRecordFields}
      onSave={handleSave}
      onCancel={handleModalClose}
      onFieldAdded={onFieldAdded}
    />
  );

  // Create summary text for current groups
  const getGroupsSummary = () => {
    if (fieldGroups.length === 0) {
      return intl.formatMessage({
        defaultMessage: 'No groups created',
        id: 'label-no-groups',
      });
    }
    
    const groupNames = fieldGroups.map(group => group.title).join(', ');
    return `${fieldGroups.length} group${fieldGroups.length > 1 ? 's' : ''}: ${groupNames}`;
  };

  return (
    <>
      <div className={styles.container}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:folder-open-line-duotone" />}
          title={intl.formatMessage({
            defaultMessage: 'Field Groups',
            id: 'label-field-groups',
          })}
          description={getGroupsSummary()}
          rightComponent={
            <div className={styles.groupControls}>
              <Button
                onClick={handleModalOpen}
                className={styles.addButton}
                type="dash"
              >
                <Icon width={16} icon="material-symbols:add" />
                {intl.formatMessage({
                  defaultMessage: 'Add Group',
                  id: 'label-add-group',
                })}
              </Button>
            </div>
          }
        />
      </div>

      {/* Add Group Modal */}
      <>
        {/* Simple overlay */}
        {isModalVisible && (
          <div className={styles.simpleOverlay} onClick={handleModalClose} />
        )}
        {/* Simple bottom sheet */}
        <div
          className={cx(styles.simpleBottomSheet, {
            [styles.visible]: isModalVisible,
          })}
        >
          {modalContent}
        </div>
      </>
    </>
  );
};

export default ChecklistFieldGroupAddGroupMobile;
