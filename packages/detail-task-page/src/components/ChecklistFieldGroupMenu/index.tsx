import React from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import BottomModal from '@moon-ui/modal/src/BottomModal';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import { FieldGroup, RecordField } from '@dreamer/global';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';

import styles from './index.module.scss';

interface ChecklistFieldGroupMenuProps {
  fieldGroup: FieldGroup;
  onUpdateFieldGroup: (updatedGroup: FieldGroup) => void;
  selectedFields?: string[];
  onSelectedFieldsChange?: (fields: string[]) => void;
  availableFields?: string[];
  allRecordFields?: RecordField[];
  onFieldAdded?: (newField: RecordField) => void;
}

// One entry per tab this group can show. `Config` isn't a real content tab any more (this is
// its replacement — see the module doc below), so it was never a candidate here to begin with.
const TAB_OPTIONS = [
  { value: ChecklistFieldGroupTab.Home, label: 'Home', icon: 'solar:home-2-line-duotone' },
  { value: ChecklistFieldGroupTab.History, label: 'History', icon: 'solar:clock-square-broken' },
  { value: ChecklistFieldGroupTab.Metric, label: 'Metric', icon: 'solar:chart-square-linear' },
  { value: ChecklistFieldGroupTab.Add, label: 'Add', icon: 'solar:add-square-line-duotone' },
];

enum Dialog {
  None,
  Name,
  Tabs,
  Collapse,
  Fields,
}

/**
 * The group's own settings — a "⋮" menu on the group header (rendered via
 * ChecklistFieldGroupHeader's `renderMenu`) instead of a `Config` tab in the tab row
 * (ChecklistFieldGroupConfig, the tab this replaces, is gone): clicking it pops up a menu of
 * what to change (Group Name, Tabs, Collapse Default, Select Fields, Delete Group), and picking
 * one opens a small dialog scoped to just that setting, rather than one long scrolling settings
 * page. `ChecklistFieldGroupTab.Config` itself stays defined in the enum (see enums.tsx) even
 * though nothing renders it as a tab any more — it's the last numeric value, and `defaultTab`/
 * `activeTabs` are persisted as raw numbers, so removing it would risk relabeling a later member
 * for any template whose stored data still contains it (harmless either way: an unrecognized tab
 * id just renders nothing / falls through to the Home-equivalent default).
 *
 * Every dialog here saves the instant it changes, same as this screen always has — no per-dialog
 * "Save" button, since there's nothing being staged. `repeat` (this group's own schedule) still
 * isn't edited here at all — see the template's own Edit Schedule modal (GroupScheduleList),
 * which edits every group's schedule in one place.
 */
const ChecklistFieldGroupMenu = ({
  fieldGroup,
  onUpdateFieldGroup,
  selectedFields = [],
  onSelectedFieldsChange,
  availableFields = [],
  allRecordFields = [],
  onFieldAdded,
}: ChecklistFieldGroupMenuProps) => {
  const intl = useIntl();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const [activeDialog, setActiveDialog] = React.useState<Dialog>(Dialog.None);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [isAddFieldPanelVisible, setIsAddFieldPanelVisible] = React.useState(false);

  const [groupName, setGroupName] = React.useState(fieldGroup.title);
  const [defaultTab, setDefaultTab] = React.useState<ChecklistFieldGroupTab>(
    fieldGroup.defaultTab ?? ChecklistFieldGroupTab.Home,
  );
  const [activeTabs, setActiveTabs] = React.useState<ChecklistFieldGroupTab[]>(
    fieldGroup.activeTabs ?? [
      ChecklistFieldGroupTab.Home,
      ChecklistFieldGroupTab.History,
      ChecklistFieldGroupTab.Metric,
      ChecklistFieldGroupTab.Add,
    ],
  );
  const [collapseDefault, setCollapseDefault] = React.useState<boolean>(
    fieldGroup.collapseDefault ?? false,
  );

  // `overrides` carries whatever just changed; everything else comes from current state, which
  // is why every handler below also passes the new value it just set locally, not relying on
  // the state setter having landed yet.
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

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left });
  };
  const closeMenu = () => setMenuPosition(null);

  const handleMenuItemClick = (dialog: Dialog | 'delete') => {
    closeMenu();
    if (dialog === 'delete') setIsDeleteModalVisible(true);
    else setActiveDialog(dialog);
  };

  const closeDialog = () => setActiveDialog(Dialog.None);

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

  const handleFieldPanelSubmit = (newField: RecordField) => {
    onFieldAdded?.(newField);
    setIsAddFieldPanelVisible(false);
  };

  // Soft delete — sets `archivedAt` instead of removing this group from `fieldGroups` (see
  // FieldGroup's own comment on why). No local state to update here: once this saves, the
  // group's own card is what gets unmounted (the template's group list stops rendering it),
  // same as any other change made from this menu.
  const handleConfirmDelete = () => {
    onUpdateFieldGroup({ ...fieldGroup, archivedAt: new Date().toISOString() });
    setIsDeleteModalVisible(false);
  };

  const getFieldDisplayInfo = (fieldId: string) => {
    const field = allRecordFields.find(f => f.id === fieldId);
    return field
      ? { title: field.title, icon: field.icon }
      : { title: fieldId, icon: 'solar:document-linear' };
  };

  const MENU_ITEMS: {
    dialog: Dialog | 'delete';
    label: string;
    icon: string;
    danger?: boolean;
  }[] = [
    {
      dialog: Dialog.Name,
      icon: 'solar:pen-2-line-duotone',
      label: intl.formatMessage({
        id: 'checklist-field-group-menu.group-name',
        defaultMessage: 'Group Name',
      }),
    },
    {
      dialog: Dialog.Tabs,
      icon: 'solar:widget-5-line-duotone',
      label: intl.formatMessage({ id: 'checklist-field-group-menu.tabs', defaultMessage: 'Tabs' }),
    },
    {
      dialog: Dialog.Collapse,
      icon: 'solar:alt-arrow-down-line-duotone',
      label: intl.formatMessage({
        id: 'checklist-field-group-menu.collapse-default',
        defaultMessage: 'Collapse Default',
      }),
    },
    ...(onSelectedFieldsChange
      ? [
          {
            dialog: Dialog.Fields,
            icon: 'solar:checklist-minimalistic-line-duotone',
            label: intl.formatMessage({
              id: 'checklist-field-group-menu.select-fields',
              defaultMessage: 'Select Fields',
            }),
          },
        ]
      : []),
    {
      dialog: 'delete' as const,
      icon: 'solar:trash-bin-trash-linear',
      label: intl.formatMessage({
        id: 'checklist-field-group-menu.delete-group',
        defaultMessage: 'Delete Group',
      }),
      danger: true,
    },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={openMenu}
        aria-label={intl.formatMessage({
          id: 'checklist-field-group-menu.open',
          defaultMessage: 'Group settings',
        })}
      >
        <Icon icon="solar:settings-line-duotone" width={18} />
      </button>

      {menuPosition && (
        <>
          <button
            type="button"
            className={styles.menuOverlay}
            onClick={closeMenu}
            aria-label={intl.formatMessage({
              id: 'checklist-field-group-menu.close',
              defaultMessage: 'Close menu',
            })}
          />
          <div
            className={styles.menu}
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {MENU_ITEMS.map(item => (
              <button
                key={item.label}
                type="button"
                className={cx(styles.menuItem, item.danger && styles.menuItemDanger)}
                onClick={() => handleMenuItemClick(item.dialog)}
              >
                <Icon icon={item.icon} width={16} />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Group Name */}
      <BottomModal
        visible={activeDialog === Dialog.Name}
        onDismiss={closeDialog}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                {intl.formatMessage({
                  id: 'checklist-field-group-menu.group-name',
                  defaultMessage: 'Group Name',
                })}
              </Typography.Title>
              <Button onClick={closeDialog} className={styles.doneButton}>
                {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
              </Button>
            </div>
            <div className={styles.modalContent}>
              <Input
                value={groupName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setGroupName(e.target.value)
                }
                placeholder={intl.formatMessage({
                  id: 'checklist-field-group-menu.group-name-placeholder',
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
        }
      />

      {/* Tabs */}
      <BottomModal
        visible={activeDialog === Dialog.Tabs}
        onDismiss={closeDialog}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                {intl.formatMessage({ id: 'checklist-field-group-menu.tabs', defaultMessage: 'Tabs' })}
              </Typography.Title>
              <Button onClick={closeDialog} className={styles.doneButton}>
                {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
              </Button>
            </div>
            <div className={styles.modalContent}>
              <Typography.Text className={styles.dialogDescription}>
                {intl.formatMessage({
                  id: 'checklist-field-group-menu.tabs-description',
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
                        className={cx(
                          styles.defaultToggle,
                          isDefault && styles.defaultToggleActive,
                        )}
                        onClick={() => handleSetDefaultTab(value)}
                        aria-pressed={isDefault}
                        aria-label={intl.formatMessage(
                          {
                            id: 'checklist-field-group-menu.make-default-tab',
                            defaultMessage: 'Make {label} the default tab',
                          },
                          { label },
                        )}
                      >
                        <Icon
                          icon={isDefault ? 'solar:star-bold' : 'solar:star-linear'}
                          width={16}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        }
      />

      {/* Collapse Default */}
      <BottomModal
        visible={activeDialog === Dialog.Collapse}
        onDismiss={closeDialog}
        content={
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <Typography.Title level={3} noMargin>
                {intl.formatMessage({
                  id: 'checklist-field-group-menu.collapse-default',
                  defaultMessage: 'Collapse Default',
                })}
              </Typography.Title>
              <Button onClick={closeDialog} className={styles.doneButton}>
                {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
              </Button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.collapseSetting}>
                <Checkbox checked={collapseDefault} onChange={handleCollapseChange} />
                <Typography.Text>
                  {intl.formatMessage({
                    id: 'checklist-field-group-menu.collapse-default-description',
                    defaultMessage: 'Start collapsed by default',
                  })}
                </Typography.Text>
              </div>
            </div>
          </div>
        }
      />

      {/* Select Fields */}
      {onSelectedFieldsChange && (
        <BottomModal
          visible={activeDialog === Dialog.Fields}
          onDismiss={closeDialog}
          content={
            <div className={styles.modalContainer}>
              <div className={styles.modalHeader}>
                <Typography.Title level={3} noMargin>
                  {intl.formatMessage({
                    id: 'checklist-field-group-menu.select-fields',
                    defaultMessage: 'Select Fields',
                  })}
                </Typography.Title>
                <Button onClick={closeDialog} className={styles.doneButton}>
                  {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
                </Button>
              </div>
              <div className={styles.modalContent}>
                <Button
                  onClick={() => setIsAddFieldPanelVisible(true)}
                  className={styles.addFieldButton}
                  type="ghost"
                  size="sm"
                >
                  <Icon width={16} icon="fe:plus" />
                  {intl.formatMessage({
                    id: 'checklist-field-group-menu.add-field',
                    defaultMessage: 'Add Field',
                  })}
                </Button>

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
                          id: 'checklist-field-group-menu.no-fields-available',
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
                          <Typography.Text className={styles.fieldLabel}>{title}</Typography.Text>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          }
        />
      )}

      <WarningModal
        visible={isDeleteModalVisible}
        title={intl.formatMessage({
          id: 'checklist-field-group-menu.delete-confirm-title',
          defaultMessage: 'Delete Group',
        })}
        primaryButtonText={intl.formatMessage({
          id: 'checklist-field-group-menu.delete-confirm-ok',
          defaultMessage: 'Delete',
        })}
        primaryButtonOnClick={handleConfirmDelete}
        secondaryButtonText={intl.formatMessage({
          id: 'checklist-field-group-menu.delete-confirm-cancel',
          defaultMessage: 'Cancel',
        })}
        secondaryButtonClick={() => setIsDeleteModalVisible(false)}
        content={intl.formatMessage(
          {
            id: 'checklist-field-group-menu.delete-confirm-message',
            defaultMessage:
              'This hides "{title}" and its fields from the task. Nothing recorded through it is deleted, and you can restore it later from General Settings → Archived Groups.',
          },
          { title: fieldGroup.title || 'this group' },
        )}
      />

      {isAddFieldPanelVisible && (
        <div className={styles.addFieldPanel}>
          <div className={styles.addFieldPanelHeader}>
            <Typography.Title level={4} noMargin>
              {intl.formatMessage({ defaultMessage: 'Add New Field', id: 'label-add-new-field' })}
            </Typography.Title>
            <Icon
              onClick={() => setIsAddFieldPanelVisible(false)}
              width={20}
              icon="basil:close-outline"
              className={styles.closeIcon}
            />
          </div>
          <div className={styles.addFieldPanelContent}>
            <AddFieldRecordUi
              onSubmit={handleFieldPanelSubmit}
              onCancel={() => setIsAddFieldPanelVisible(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChecklistFieldGroupMenu;
