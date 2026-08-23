import React from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import { FieldGroup, RecordField } from '@dreamer/global';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';

import styles from './index.module.scss';

interface ChecklistFieldGroupConfigProps {
  fieldGroup: FieldGroup;
  onUpdateFieldGroup: (updatedGroup: FieldGroup) => void;
  selectedFields?: string[];
  onSelectedFieldsChange?: (fields: string[]) => void;
  availableFields?: string[];
  allRecordFields?: RecordField[];
  onFieldAdded?: (newField: RecordField) => void;
}

// One entry per tab this group can show. `Config` (this screen itself) is deliberately left out
// — hiding the tab you're currently configuring, or landing on it by default, isn't a choice
// that makes sense to offer from inside it.
const TAB_OPTIONS = [
  { value: ChecklistFieldGroupTab.Home, label: 'Home', icon: 'solar:home-2-line-duotone' },
  { value: ChecklistFieldGroupTab.History, label: 'History', icon: 'solar:clock-square-broken' },
  { value: ChecklistFieldGroupTab.Metric, label: 'Metric', icon: 'solar:chart-square-linear' },
  { value: ChecklistFieldGroupTab.Add, label: 'Add', icon: 'solar:add-square-line-duotone' },
];

const ChecklistFieldGroupConfig = ({
  fieldGroup,
  onUpdateFieldGroup,
  selectedFields = [],
  onSelectedFieldsChange,
  availableFields = [],
  allRecordFields = [],
  onFieldAdded,
}: ChecklistFieldGroupConfigProps) => {
  const intl = useIntl();
  const [groupName, setGroupName] = React.useState(fieldGroup.title);
  const [defaultTab, setDefaultTab] = React.useState<ChecklistFieldGroupTab>(
    fieldGroup.defaultTab ?? ChecklistFieldGroupTab.Home,
  );
  const [activeTabs, setActiveTabs] = React.useState<ChecklistFieldGroupTab[]>(
    fieldGroup.activeTabs ?? [
      ChecklistFieldGroupTab.Home,
      ChecklistFieldGroupTab.History,
      ChecklistFieldGroupTab.Metric,
      ChecklistFieldGroupTab.Config,
      ChecklistFieldGroupTab.Add,
    ],
  );
  const [collapseDefault, setCollapseDefault] = React.useState<boolean>(
    fieldGroup.collapseDefault ?? false,
  );
  const [isAddFieldPanelVisible, setIsAddFieldPanelVisible] = React.useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);

  // Every control on this screen saves the instant it changes — same as field selection below
  // always has — rather than staging edits behind a single "Save Changes" button. A mix of the
  // two within one screen is what made it easy to believe an edit had saved when it hadn't.
  // `overrides` carries whatever just changed; everything else comes from current state, which
  // is why this needs the caller to also pass the new value it just set locally, not rely on the
  // state setter having landed yet. `repeat` (this group's own schedule) isn't edited here at
  // all anymore — see the template's own Edit Schedule modal (GroupScheduleList), which edits
  // every group's schedule in one place — so it's left out of the spread below and just passes
  // through from `fieldGroup` unchanged.
  const saveGroup = (overrides: Partial<FieldGroup> = {}) => {
    onUpdateFieldGroup({
      ...fieldGroup,
      title: groupName.trim(),
      defaultTab,
      activeTabs,
      collapseDefault,
      ...overrides,
    });
  };

  const handleNameBlur = () => {
    const trimmed = groupName.trim();
    if (trimmed !== fieldGroup.title) saveGroup({ title: trimmed });
  };

  const handleTabToggle = (tab: ChecklistFieldGroupTab) => {
    const isActive = activeTabs.includes(tab);
    // Keep at least one tab active — silently ignore the toggle that would clear the last one.
    if (isActive && activeTabs.length === 1) return;

    const newActiveTabs = isActive ? activeTabs.filter(t => t !== tab) : [...activeTabs, tab];
    setActiveTabs(newActiveTabs);

    // If the default tab is being removed, fall back to the first remaining tab.
    let newDefaultTab = defaultTab;
    if (!newActiveTabs.includes(defaultTab)) {
      newDefaultTab = newActiveTabs[0];
      setDefaultTab(newDefaultTab);
    }
    saveGroup({ activeTabs: newActiveTabs, defaultTab: newDefaultTab });
  };

  const handleSetDefaultTab = (tab: ChecklistFieldGroupTab) => {
    // Marking a tab as default also activates it — a default tab that isn't shown doesn't mean
    // anything.
    const newActiveTabs = activeTabs.includes(tab) ? activeTabs : [...activeTabs, tab];
    setActiveTabs(newActiveTabs);
    setDefaultTab(tab);
    saveGroup({ activeTabs: newActiveTabs, defaultTab: tab });
  };

  const handleCollapseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setCollapseDefault(checked);
    saveGroup({ collapseDefault: checked });
  };

  const handleFieldToggle = (fieldId: string) => {
    if (!onSelectedFieldsChange) return;

    const newSelectedFields = selectedFields.includes(fieldId)
      ? selectedFields.filter(id => id !== fieldId)
      : [...selectedFields, fieldId];
    onSelectedFieldsChange(newSelectedFields);
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

  // Soft delete — sets `archivedAt` instead of the caller removing this group from
  // `fieldGroups` (see FieldGroup's own comment on why). No local state to update here: once
  // this saves, the group's own screen is what gets unmounted (this template's group list stops
  // rendering it), same as any other change made from this tab.
  const handleConfirmDelete = () => {
    onUpdateFieldGroup({ ...fieldGroup, archivedAt: new Date().toISOString() });
    setIsDeleteModalVisible(false);
  };

  // Get field display info
  const getFieldDisplayInfo = (fieldId: string) => {
    const field = allRecordFields.find(f => f.id === fieldId);
    return field ? { title: field.title, icon: field.icon } : { title: fieldId, icon: 'solar:document-linear' };
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.group-name',
            defaultMessage: 'Group Name',
          })}
        </Typography.Title>
        <div className={styles.inputGroup}>
          <Input
            value={groupName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'checklist-field-group-config.group-name-placeholder',
              defaultMessage: 'Enter group name',
            })}
            onBlur={handleNameBlur}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === 'Enter' && (e.target as HTMLInputElement).blur()
            }
            renderRightInput={() => <></>}
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.tabs',
            defaultMessage: 'Tabs',
          })}
        </Typography.Title>
        <Typography.Text className={styles.sectionDescription}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.tabs-description',
            defaultMessage: 'Which tabs show for this group, and which one opens first.',
          })}
        </Typography.Text>
        <div className={styles.tabList}>
          {TAB_OPTIONS.map(({ value, label, icon }) => {
            const isActive = activeTabs.includes(value);
            const isDefault = defaultTab === value;
            return (
              <div key={value} className={styles.tabRow}>
                <Checkbox
                  checked={isActive}
                  onChange={() => handleTabToggle(value)}
                  disabled={isActive && activeTabs.length === 1}
                />
                <Icon icon={icon} width={16} />
                <Typography.Text className={styles.tabRowLabel}>{label}</Typography.Text>
                <button
                  type="button"
                  className={cx(styles.defaultToggle, isDefault && styles.defaultToggleActive)}
                  onClick={() => handleSetDefaultTab(value)}
                  aria-pressed={isDefault}
                  aria-label={intl.formatMessage(
                    {
                      id: 'checklist-field-group-config.make-default-tab',
                      defaultMessage: 'Make {label} the default tab',
                    },
                    { label },
                  )}
                >
                  <Icon icon={isDefault ? 'solar:star-bold' : 'solar:star-linear'} width={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.collapse-default',
            defaultMessage: 'Collapse Default',
          })}
        </Typography.Title>
        <div className={styles.collapseSetting}>
          <Checkbox checked={collapseDefault} onChange={handleCollapseChange} />
          <Typography.Text>
            {intl.formatMessage({
              id: 'checklist-field-group-config.collapse-default-description',
              defaultMessage: 'Start collapsed by default',
            })}
          </Typography.Text>
        </div>
      </div>

      {onSelectedFieldsChange && (
        <>
          <div className={styles.divider} />
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <Typography.Title level={5} noMargin className={styles.sectionTitle}>
                {intl.formatMessage({
                  id: 'checklist-field-group-config.select-fields',
                  defaultMessage: 'Select Fields',
                })}
              </Typography.Title>
              <Button
                onClick={handleAddField}
                className={styles.addFieldButton}
                type="ghost"
                size="sm"
              >
                <Icon width={16} icon="fe:plus" />
                {intl.formatMessage({
                  id: 'checklist-field-group-config.add-field',
                  defaultMessage: 'Add Field',
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
                      id: 'checklist-field-group-config.no-fields-available',
                      defaultMessage: 'No fields available',
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
        </>
      )}

      <div className={styles.divider} />

      <div className={styles.section}>
        <Button
          type="ghost"
          onClick={() => setIsDeleteModalVisible(true)}
          className={styles.deleteGroupButton}
        >
          <Icon width={16} icon="solar:trash-bin-trash-linear" />
          {intl.formatMessage({
            id: 'checklist-field-group-config.delete-group',
            defaultMessage: 'Delete Group',
          })}
        </Button>
      </div>

      <WarningModal
        visible={isDeleteModalVisible}
        title={intl.formatMessage({
          id: 'checklist-field-group-config.delete-confirm-title',
          defaultMessage: 'Delete Group',
        })}
        primaryButtonText={intl.formatMessage({
          id: 'checklist-field-group-config.delete-confirm-ok',
          defaultMessage: 'Delete',
        })}
        primaryButtonOnClick={handleConfirmDelete}
        secondaryButtonText={intl.formatMessage({
          id: 'checklist-field-group-config.delete-confirm-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={() => setIsDeleteModalVisible(false)}
        content={intl.formatMessage({
          id: 'checklist-field-group-config.delete-confirm-message',
          defaultMessage:
            'This hides "{title}" and its fields from the task. Nothing recorded through it is deleted, and you can restore it later from General Settings → Archived Groups.',
        }, { title: fieldGroup.title || 'this group' })}
      />

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

export default ChecklistFieldGroupConfig;
