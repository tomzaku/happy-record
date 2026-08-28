import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import List from '@moon-ui/list';
import Button from '@moon-ui/button/src/DefaultButton';
import Checkbox from '@moon-ui/checkbox';
import Input from '@moon-ui/input';
import Typography from '@moon-ui/typography';
import { useIntl } from '@dreamer/translation';
import { FieldGroup, RecordField, useRecordField } from '@dreamer/global';
import SettingsDialog from '../SettingsDialog';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import styles from './index.module.scss';

interface ChecklistFieldGroupAddGroupProps {
  fieldGroups?: FieldGroup[];
  onAddFieldGroup: (newGroup: FieldGroup) => void;
  availableFields?: string[];
  onFieldAdded?: (newField: RecordField) => void;
}

// Form/AddField are the same two-view drill-down ChecklistFieldGroupMenu's own Select Fields
// sheet uses (List/Add/Customize there) — see this component's own module doc for why.
enum AddGroupView {
  Form,
  AddField,
}

/**
 * "Add Group" — one SettingsDialog (badge/gradient header, Modal on desktop, BottomModal on
 * mobile — see that component's own doc), not the Modal-vs-hand-rolled-overlay pair this used
 * to be split across `index.desktop.tsx`/`index.mobile.tsx`: those two files' actual trigger
 * row markup was byte-for-byte identical, and only diverged in *how* they opened a modal at
 * all — a difference SettingsDialog already owns internally now, so the split had nothing left
 * to justify it.
 *
 * "Add Field" used to open `AddFieldRecordUi` as a second panel stacked on top of this one —
 * the exact z-index conflict ChecklistFieldGroupMenu's own Select Fields sheet had (BottomModal
 * portals to a shared modal root with its own fixed z-index; a plain in-tree `position: fixed`
 * panel can't reliably stack above that — see FieldsView's own comment there for the full
 * reasoning). Sliding Add Field in as a second view of this same sheet, with Back in the
 * header, sidesteps that instead of chasing z-index.
 */
const ChecklistFieldGroupAddGroup = ({
  fieldGroups = [],
  onAddFieldGroup,
  availableFields,
  onFieldAdded,
}: ChecklistFieldGroupAddGroupProps) => {
  const intl = useIntl();
  const { getAllRecordFields } = useRecordField();

  const allRecordFields = React.useMemo(() => getAllRecordFields(), [getAllRecordFields]);
  const actualAvailableFields = React.useMemo(
    () => availableFields ?? allRecordFields.map(field => field.id),
    [availableFields, allRecordFields],
  );

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [view, setView] = React.useState<AddGroupView>(AddGroupView.Form);
  const [groupName, setGroupName] = React.useState('');
  const [selectedFields, setSelectedFields] = React.useState<string[]>([]);

  const resetForm = () => {
    setGroupName('');
    setSelectedFields([]);
    setView(AddGroupView.Form);
  };

  const handleModalOpen = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    resetForm();
  };

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldId) ? prev.filter(id => id !== fieldId) : [...prev, fieldId],
    );
  };

  const getFieldDisplayInfo = (fieldId: string) => {
    const field = allRecordFields.find(f => f.id === fieldId);
    return field
      ? { title: field.title, icon: field.icon }
      : { title: fieldId, icon: 'solar:document-linear' };
  };

  const handleFieldAdded = (newField: RecordField) => {
    onFieldAdded?.(newField);
    setView(AddGroupView.Form);
  };

  const isFormValid = groupName.trim().length > 0 && selectedFields.length > 0;

  const handleSave = () => {
    if (!isFormValid) return;
    const newGroup: FieldGroup = {
      id: `group-${Date.now()}`,
      title: groupName.trim(),
      // No overrides on creation — Select Fields' own "Customize" panel (ChecklistFieldGroupMenu)
      // is where those get set, once the group actually exists.
      fields: selectedFields.map(fieldId => ({ fieldId })),
      note: null,
      // All four real tabs, not just Add+Config — the old desktop-only default (see git history)
      // left a freshly created group unable to show History/Metric at all until someone opened
      // its own Tabs dialog and turned them back on.
      defaultTab: ChecklistFieldGroupTab.Add,
      activeTabs: [
        ChecklistFieldGroupTab.Home,
        ChecklistFieldGroupTab.History,
        ChecklistFieldGroupTab.Metric,
        ChecklistFieldGroupTab.Add,
      ],
      collapseDefault: false,
    };
    onAddFieldGroup(newGroup);
    handleModalClose();
  };

  const getGroupsSummary = () => {
    if (fieldGroups.length === 0) {
      return intl.formatMessage({ defaultMessage: 'No groups created', id: 'label-no-groups' });
    }
    const groupNames = fieldGroups.map(group => group.title).join(', ');
    return `${fieldGroups.length} group${fieldGroups.length > 1 ? 's' : ''}: ${groupNames}`;
  };

  return (
    <>
      <div className={styles.container}>
        <List.ItemMeta
          logo={<Icon width={24} icon="solar:folder-open-line-duotone" />}
          title={intl.formatMessage({ defaultMessage: 'Field Groups', id: 'label-field-groups' })}
          description={getGroupsSummary()}
          rightComponent={
            <Button onClick={handleModalOpen} className={styles.addButton} type="dash">
              <Icon width={16} icon="material-symbols:add" />
              {intl.formatMessage({ defaultMessage: 'Add Group', id: 'label-add-group' })}
            </Button>
          }
        />
      </div>

      <SettingsDialog
        visible={isModalVisible}
        onDismiss={handleModalClose}
        icon="solar:folder-open-line-duotone"
        onBack={view === AddGroupView.AddField ? () => setView(AddGroupView.Form) : undefined}
        title={
          view === AddGroupView.AddField
            ? intl.formatMessage({ id: 'label-add-new-field', defaultMessage: 'Add New Field' })
            : intl.formatMessage({
                id: 'label-create-new-group',
                defaultMessage: 'Create New Group',
              })
        }
        footer={
          view === AddGroupView.Form ? (
            <>
              <Button type="ghost" className={styles.secondaryButton} onClick={handleModalClose}>
                {intl.formatMessage({ id: 'label-cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
                className={styles.gradientButton}
                disabled={!isFormValid}
                onClick={handleSave}
              >
                {intl.formatMessage({ id: 'label-create-group', defaultMessage: 'Create Group' })}
              </Button>
            </>
          ) : undefined
          // AddField has no footer here — CoreFieldRecord (via AddFieldRecordUi) already renders
          // its own Cancel/Save pair.
        }
      >
        {view === AddGroupView.Form && (
          <>
            <Typography.Text className={styles.description}>
              {intl.formatMessage({
                defaultMessage:
                  "A group bundles a few fields so they're recorded together as one section — like Duration + Distance under \"Cardio\", or Push-ups + Pull-ups under \"Strength\".",
                id: 'label-create-new-group-description',
              })}
            </Typography.Text>

            <div className={styles.section}>
              <Typography.Text className={styles.sectionTitle}>
                {intl.formatMessage({ defaultMessage: 'Group Name', id: 'label-group-name' })}
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
                border="dash"
                renderRightInput={() => <></>}
              />
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <Typography.Text className={styles.sectionTitle}>
                  {intl.formatMessage({ defaultMessage: 'Select Fields', id: 'label-select-fields' })}
                </Typography.Text>
                <Button
                  onClick={() => setView(AddGroupView.AddField)}
                  className={styles.addFieldButton}
                  type="ghost"
                  size="sm"
                >
                  <Icon width={16} icon="fe:plus" />
                  {intl.formatMessage({ defaultMessage: 'Add Field', id: 'label-add-field' })}
                </Button>
              </div>

              <div className={styles.fieldsList}>
                {actualAvailableFields.length === 0 ? (
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
                  actualAvailableFields.map(fieldId => {
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
                        <Typography.Text className={styles.fieldLabel}>{title}</Typography.Text>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {view === AddGroupView.AddField && (
          <AddFieldRecordUi onSubmit={handleFieldAdded} onCancel={() => setView(AddGroupView.Form)} />
        )}
      </SettingsDialog>
    </>
  );
};

export default ChecklistFieldGroupAddGroup;
