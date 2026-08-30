import React from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import List from '@moon-ui/list';
import WarningModal from '@moon-ui/modal/src/WarningModal';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import { FieldGroup, FieldGroupField, FieldOverrides, RecordField } from '@dreamer/global';
import { getEffectiveFieldDisplay } from '@dreamer/global/src/store/record-field';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';
import IconPicker from '../../../../create-checklist-page-ui/src/IconPicker';
import DialogModal from '@moon-ui/modal/src/Dialog';

import styles from './index.module.scss';

interface ChecklistFieldGroupMenuProps {
  fieldGroup: FieldGroup;
  onUpdateFieldGroup: (updatedGroup: FieldGroup) => void;
  availableFields?: string[];
  allRecordFields?: RecordField[];
  onFieldAdded?: (newField: RecordField) => void;
}

// What a caller outside this menu (the Submit tab's own "Select Fields" button — see
// ChecklistFieldGroupAdd) can reach through a ref, since the Select Fields dialog's visibility
// is state private to this component, not a prop.
export type ChecklistFieldGroupMenuHandle = {
  openFieldsDialog: () => void;
};

type OverrideFormState = {
  title: string;
  icon: string;
  iconColor: string;
  defaultValue?: number;
  placeholder: string;
};

const EMPTY_OVERRIDE_FORM: OverrideFormState = {
  title: '',
  icon: '',
  iconColor: '#607d8b',
  defaultValue: undefined,
  placeholder: '',
};

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

// The Select Fields sheet's own sub-view — Add Field and Customize used to be a second,
// separately-fixed panel stacked on top of this BottomModal, but BottomModal is portaled to a
// shared modal root with its own fixed z-index (see BottomModal.module.scss's `$modal-z-index`),
// so a plain in-tree `position: fixed` panel painted *underneath* it regardless of its own
// z-index — the two were never going to stack correctly against each other. Sliding these in as
// views inside the same sheet (drill-down, with Back) sidesteps that instead of chasing z-index:
// there's only ever one sheet mounted for this flow at a time.
enum FieldsView {
  List,
  Add,
  Customize,
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
const ChecklistFieldGroupMenu = React.forwardRef<
  ChecklistFieldGroupMenuHandle,
  ChecklistFieldGroupMenuProps
>(({
  fieldGroup,
  onUpdateFieldGroup,
  availableFields = [],
  allRecordFields = [],
  onFieldAdded,
}: ChecklistFieldGroupMenuProps, ref) => {
  const intl = useIntl();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const [activeDialog, setActiveDialog] = React.useState<Dialog>(Dialog.None);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = React.useState(false);
  const [fieldsView, setFieldsView] = React.useState<FieldsView>(FieldsView.List);

  React.useImperativeHandle(ref, () => ({
    openFieldsDialog: () => setActiveDialog(Dialog.Fields),
  }));

  // The group's own field list, straight off `fieldGroup` — no separate prop/setter pair for
  // this one (unlike Name/Tabs/Collapse, which stage into local state first): a field's
  // selection and its overrides both live on this same array, and toggling/editing either one
  // saves immediately, same as every other control in this menu.
  const groupFields = fieldGroup.fields;
  const selectedFieldIds = React.useMemo(
    () => groupFields.map(f => f.fieldId),
    [groupFields],
  );
  const updateGroupFields = (newFields: FieldGroupField[]) =>
    onUpdateFieldGroup({ ...fieldGroup, fields: newFields });

  // Which field the Customize sub-view (FieldsView.Customize) is currently showing.
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [overrideForm, setOverrideForm] = React.useState<OverrideFormState>(EMPTY_OVERRIDE_FORM);

  const openOverrideEditor = (fieldId: string) => {
    const field = allRecordFields.find(f => f.id === fieldId);
    if (!field) return;
    const current = groupFields.find(f => f.fieldId === fieldId)?.overrides;
    // Text/number inputs start blank (blank = "inherit the field's own value" — see
    // handleSaveOverride) with the global value shown only as the input's placeholder hint.
    // The icon picker has no equivalent blank state, so it starts at the *effective* icon
    // (override, else the field's own) instead.
    setOverrideForm({
      title: current?.title ?? '',
      icon: current?.icon ?? field.icon,
      iconColor: EMPTY_OVERRIDE_FORM.iconColor,
      defaultValue: current?.defaultValue,
      placeholder: current?.placeholder ?? '',
    });
    setEditingFieldId(fieldId);
    setFieldsView(FieldsView.Customize);
  };

  const closeOverrideEditor = () => {
    setEditingFieldId(null);
    setFieldsView(FieldsView.List);
  };

  const handleSaveOverride = () => {
    if (!editingFieldId) return;
    const field = allRecordFields.find(f => f.id === editingFieldId);
    const overrides: FieldOverrides = {};
    if (overrideForm.title.trim()) overrides.title = overrideForm.title.trim();
    if (overrideForm.placeholder.trim()) overrides.placeholder = overrideForm.placeholder.trim();
    if (overrideForm.defaultValue !== undefined) overrides.defaultValue = overrideForm.defaultValue;
    // Only carried as a real override when it actually differs from the field's own icon —
    // otherwise every save through this panel would silently pin an override that just
    // happens to match the global value today, and stop following it if that ever changes.
    if (field && overrideForm.icon && overrideForm.icon !== field.icon) {
      overrides.icon = overrideForm.icon;
    }
    updateGroupFields(
      groupFields.map(f =>
        f.fieldId === editingFieldId
          ? { ...f, overrides: Object.keys(overrides).length > 0 ? overrides : undefined }
          : f,
      ),
    );
    closeOverrideEditor();
  };

  const handleResetOverride = () => {
    if (!editingFieldId) return;
    updateGroupFields(
      groupFields.map(f => (f.fieldId === editingFieldId ? { ...f, overrides: undefined } : f)),
    );
    closeOverrideEditor();
  };

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

  // Also resets the Fields sheet back to its list view — otherwise reopening Select Fields
  // later (after leaving it mid-Customize, say) would jump straight back into that sub-view.
  const closeDialog = () => {
    setActiveDialog(Dialog.None);
    setFieldsView(FieldsView.List);
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

  // `activeTabs`' own array order *is* the tab bar's render order (see
  // ChecklistFieldGroupHeader's own comment on why it maps over `activeTabs` rather than
  // filtering a fixed literal) — swapping two entries here is a real reorder, not just bookkeeping.
  // Only active tabs are reachable through this (an inactive one has no position that means
  // anything until it's turned on, which appends it to the end — see handleTabToggle).
  const handleMoveTab = (tab: ChecklistFieldGroupTab, direction: -1 | 1) => {
    const index = activeTabs.indexOf(tab);
    const newIndex = index + direction;
    if (index === -1 || newIndex < 0 || newIndex >= activeTabs.length) return;
    const newActiveTabs = [...activeTabs];
    [newActiveTabs[index], newActiveTabs[newIndex]] = [newActiveTabs[newIndex], newActiveTabs[index]];
    setActiveTabs(newActiveTabs);
    saveGroup({ activeTabs: newActiveTabs });
  };

  const handleCollapseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setCollapseDefault(checked);
    saveGroup({ collapseDefault: checked });
  };

  const handleFieldToggle = (fieldId: string) => {
    const newFields = selectedFieldIds.includes(fieldId)
      ? groupFields.filter(f => f.fieldId !== fieldId)
      : [...groupFields, { fieldId }];
    updateGroupFields(newFields);
  };

  const handleFieldPanelSubmit = (newField: RecordField) => {
    onFieldAdded?.(newField);
    setFieldsView(FieldsView.List);
  };

  // Soft delete — sets `archivedAt` instead of removing this group from `fieldGroups` (see
  // FieldGroup's own comment on why). No local state to update here: once this saves, the
  // group's own card is what gets unmounted (the template's group list stops rendering it),
  // same as any other change made from this menu.
  const handleConfirmDelete = () => {
    onUpdateFieldGroup({ ...fieldGroup, archivedAt: new Date().toISOString() });
    setIsDeleteModalVisible(false);
  };

  // Shows this group's own effective title/icon for a field (its override, if any, else the
  // field's own value) — not just the field's global values — so a row that's already been
  // customized actually reads that way in the list, not just in the editor panel. Returns the
  // whole effective RecordField (not just {title, icon}) so the Select Fields row below can
  // also show what kind of field this is — type/unit/description aren't overridable per-group
  // (see FieldOverrides' own comment), so these always come straight off the base field.
  const getFieldDisplayInfo = (fieldId: string): RecordField => {
    const field = allRecordFields.find(f => f.id === fieldId);
    if (!field) {
      return {
        id: fieldId,
        title: fieldId,
        icon: 'solar:document-linear',
        description: '',
        type: 'note',
        unit: '',
        updatedAt: '',
      };
    }
    const overrides = groupFields.find(f => f.fieldId === fieldId)?.overrides;
    return getEffectiveFieldDisplay(field, overrides);
  };

  // The Select Fields row's subtitle — the field's own description when it has one (the most
  // concrete info about what it actually records), else a plain "what kind of field is this"
  // fallback so a row is never left with nothing under the title.
  const getFieldSummary = (field: RecordField) => {
    if (field.description) return field.description;
    switch (field.type) {
      case 'number':
        return field.unit
          ? intl.formatMessage(
              { id: 'checklist-field-group-menu.field-summary-number-unit', defaultMessage: 'Number · {{unit}}' },
              { unit: field.unit },
            )
          : intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-number', defaultMessage: 'Number' });
      case 'text':
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-text', defaultMessage: 'Short Text' });
      case 'date':
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-date', defaultMessage: 'Date' });
      case 'datetime':
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-datetime', defaultMessage: 'Date & Time' });
      case 'select':
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-select', defaultMessage: 'Multiple Choice' });
      case 'multiselect':
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-multiselect', defaultMessage: 'Multiple Select' });
      case 'note':
      default:
        return intl.formatMessage({ id: 'checklist-field-group-menu.field-summary-note', defaultMessage: 'Note' });
    }
  };

  const editingField = allRecordFields.find(f => f.id === editingFieldId);

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
    {
      dialog: Dialog.Fields,
      icon: 'solar:checklist-minimalistic-line-duotone',
      label: intl.formatMessage({
        id: 'checklist-field-group-menu.select-fields',
        defaultMessage: 'Select Fields',
      }),
    },
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
      <DialogModal
        visible={activeDialog === Dialog.Name}
        onDismiss={closeDialog}
        icon="solar:pen-2-line-duotone"
        title={intl.formatMessage({
          id: 'checklist-field-group-menu.group-name',
          defaultMessage: 'Group Name',
        })}
        headerAction={
          <Button onClick={closeDialog} className={styles.headerDoneButton}>
            {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
          </Button>
        }
      >
        <Input
          value={groupName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroupName(e.target.value)}
          placeholder={intl.formatMessage({
            id: 'checklist-field-group-menu.group-name-placeholder',
            defaultMessage: 'Enter group name',
          })}
          onBlur={handleNameBlur}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === 'Enter' && (e.target as HTMLInputElement).blur()
          }
          // Input has no border at all by default (just the background) — without this it read
          // as plain text, not an editable field, same reasoning as every other text input in
          // this menu (the Customize sub-view's own Name/Placeholder/Default Value) already
          // using `border="dash"`.
          border="dash"
          renderRightInput={() => <></>}
        />
      </DialogModal>

      {/* Tabs */}
      <DialogModal
        visible={activeDialog === Dialog.Tabs}
        onDismiss={closeDialog}
        icon="solar:widget-5-line-duotone"
        title={intl.formatMessage({ id: 'checklist-field-group-menu.tabs', defaultMessage: 'Tabs' })}
        headerAction={
          <Button onClick={closeDialog} className={styles.headerDoneButton}>
            {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
          </Button>
        }
      >
        <Typography.Text className={styles.description}>
          {intl.formatMessage({
            id: 'checklist-field-group-menu.tabs-description',
            defaultMessage: 'Which tabs show for this group, and which one opens first.',
          })}
        </Typography.Text>
        <div className={styles.tabList}>
          {/* Active tabs first, in `activeTabs`' own order (the tab bar's real render order —
              see ChecklistFieldGroupHeader's own comment on why), then whatever's still off in
              TAB_OPTIONS' fixed canonical order — an inactive tab has no position of its own to
              show yet; turning it on appends it to the end (see handleTabToggle). */}
          {[
            ...activeTabs
              .map(tab => TAB_OPTIONS.find(option => option.value === tab))
              .filter((option): option is (typeof TAB_OPTIONS)[number] => option !== undefined),
            ...TAB_OPTIONS.filter(option => !activeTabs.includes(option.value)),
          ].map(({ value, label, icon }) => {
            const isActive = activeTabs.includes(value);
            const isDefault = defaultTab === value;
            const activeIndex = activeTabs.indexOf(value);
            return (
              <div key={value} className={styles.tabRow}>
                <Checkbox
                  checked={isActive}
                  onChange={() => handleTabToggle(value)}
                  disabled={isActive && activeTabs.length === 1}
                />
                <Icon icon={icon} width={16} />
                <Typography.Text className={styles.tabRowLabel}>{label}</Typography.Text>
                {/* Reordering only means anything for a tab that's actually shown somewhere —
                    an inactive row has no position to move. */}
                {isActive && (
                  <div className={styles.reorderButtons}>
                    <button
                      type="button"
                      className={styles.reorderButton}
                      onClick={() => handleMoveTab(value, -1)}
                      disabled={activeIndex === 0}
                      aria-label={intl.formatMessage({
                        id: 'checklist-field-group-menu.move-tab-up',
                        defaultMessage: 'Move up',
                      })}
                    >
                      <Icon icon="solar:alt-arrow-up-linear" width={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.reorderButton}
                      onClick={() => handleMoveTab(value, 1)}
                      disabled={activeIndex === activeTabs.length - 1}
                      aria-label={intl.formatMessage({
                        id: 'checklist-field-group-menu.move-tab-down',
                        defaultMessage: 'Move down',
                      })}
                    >
                      <Icon icon="solar:alt-arrow-down-linear" width={14} />
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className={cx(styles.defaultToggle, isDefault && styles.defaultToggleActive)}
                  onClick={() => handleSetDefaultTab(value)}
                  aria-pressed={isDefault}
                  aria-label={intl.formatMessage(
                    {
                      id: 'checklist-field-group-menu.make-default-tab',
                      defaultMessage: 'Make {{label}} the default tab',
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
      </DialogModal>

      {/* Collapse Default */}
      <DialogModal
        visible={activeDialog === Dialog.Collapse}
        onDismiss={closeDialog}
        icon="solar:alt-arrow-down-line-duotone"
        title={intl.formatMessage({
          id: 'checklist-field-group-menu.collapse-default',
          defaultMessage: 'Collapse Default',
        })}
        headerAction={
          <Button onClick={closeDialog} className={styles.headerDoneButton}>
            {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
          </Button>
        }
      >
        <div className={styles.collapseSetting}>
          <Checkbox checked={collapseDefault} onChange={handleCollapseChange} />
          <Typography.Text>
            {intl.formatMessage({
              id: 'checklist-field-group-menu.collapse-default-description',
              defaultMessage: 'Start collapsed by default',
            })}
          </Typography.Text>
        </div>
      </DialogModal>

      {/* Select Fields — List/Add/Customize are three views of this one sheet (see FieldsView's
          own comment for why this isn't three separately-stacked modals). */}
      <DialogModal
        visible={activeDialog === Dialog.Fields}
        onDismiss={closeDialog}
        // Only actually shows when `onBack` is unset (List) — Add/Customize show the back arrow
        // in its place instead.
        icon="solar:checklist-minimalistic-line-duotone"
        onBack={fieldsView !== FieldsView.List ? () => setFieldsView(FieldsView.List) : undefined}
        // List's own checkbox toggles save live (same as every other dialog in this menu — see
        // this file's own module doc comment) — nothing there to lose. Add/Customize are real
        // staged forms though (a whole new field's title/icon/type; `overrideForm`, only
        // committed by their own explicit Save/Done — see handleSaveOverride) that a stray
        // backdrop click shouldn't be able to throw away.
        closeOnOverlayClick={fieldsView === FieldsView.List}
        title={
          fieldsView === FieldsView.Add
            ? intl.formatMessage({ id: 'label-add-new-field', defaultMessage: 'Add New Field' })
            : fieldsView === FieldsView.Customize
              ? intl.formatMessage(
                  {
                    id: 'checklist-field-group-menu.customize-field-title',
                    defaultMessage: 'Customize {{title}}',
                  },
                  { title: editingField?.title ?? '' },
                )
              : intl.formatMessage({
                  id: 'checklist-field-group-menu.select-fields',
                  defaultMessage: 'Select Fields',
                })
        }
        headerAction={
          fieldsView === FieldsView.List ? (
            <Button onClick={closeDialog} className={styles.headerDoneButton}>
              {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
            </Button>
          ) : undefined
          // Add/Customize fall through to the plain close X — Customize keeps its own
          // Reset+Done footer below, and Add's own Cancel/Save pair already covers it.
        }
        footer={
          fieldsView === FieldsView.Customize && editingField ? (
            <>
              <Button type="ghost" className={styles.secondaryButton} onClick={handleResetOverride}>
                {intl.formatMessage({
                  id: 'checklist-field-group-menu.customize-reset',
                  defaultMessage: 'Reset to Default',
                })}
              </Button>
              <Button className={styles.gradientButton} onClick={handleSaveOverride}>
                {intl.formatMessage({ id: 'label-done', defaultMessage: 'Done' })}
              </Button>
            </>
          ) : undefined
          // FieldsView.Add has no footer here — CoreFieldRecord (via AddFieldRecordUi) already
          // renders its own Cancel/Save pair.
        }
      >
        {fieldsView === FieldsView.List && (
          <>
            <div className={styles.fieldsList}>
              {availableFields.length === 0 ? (
                <div className={styles.emptyState}>
                  <Icon width={48} icon="solar:folder-open-line-duotone" className={styles.emptyIcon} />
                  <Typography.Text className={styles.emptyText}>
                    {intl.formatMessage({
                      id: 'checklist-field-group-menu.no-fields-available',
                      defaultMessage: 'No fields available',
                    })}
                  </Typography.Text>
                </div>
              ) : (
                availableFields.map(fieldId => {
                  const field = getFieldDisplayInfo(fieldId);
                  const isChecked = selectedFieldIds.includes(fieldId);
                  return (
                    <List.ItemMeta
                      key={fieldId}
                      className={styles.fieldItem}
                      onClick={() => handleFieldToggle(fieldId)}
                      logo={
                        <div className={styles.fieldIconBadge}>
                          <Icon width={20} icon={field.icon} />
                        </div>
                      }
                      title={field.title}
                      description={getFieldSummary(field)}
                      rightComponent={
                        // Stops the toggle-on-row-click above from double-firing when the click
                        // actually landed on the checkbox itself, and keeps the edit pencil from
                        // toggling the field at all.
                        <div className={styles.fieldRowActions} onClick={e => e.stopPropagation()}>
                          <Checkbox
                            key={`${fieldId}-${isChecked}`}
                            checked={isChecked}
                            onChange={() => handleFieldToggle(fieldId)}
                          />
                          {/* Only a field already in the group has anything to customize — an
                              unselected row has no FieldGroupField entry for its overrides to
                              live on yet. */}
                          {isChecked && (
                            <button
                              type="button"
                              className={styles.fieldEditButton}
                              onClick={() => openOverrideEditor(fieldId)}
                              aria-label={intl.formatMessage({
                                id: 'checklist-field-group-menu.customize-field',
                                defaultMessage: 'Customize for this group',
                              })}
                            >
                              <Icon icon="solar:pen-2-line-duotone" width={16} />
                            </button>
                          )}
                        </div>
                      }
                    />
                  );
                })
              )}
            </div>

            <Button
              onClick={() => setFieldsView(FieldsView.Add)}
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
          </>
        )}

        {fieldsView === FieldsView.Add && (
          <AddFieldRecordUi
            onSubmit={handleFieldPanelSubmit}
            onCancel={() => setFieldsView(FieldsView.List)}
          />
        )}

        {/* Every value here starts blank (the input's own placeholder shows what the field's
            own global value is) so "leave it blank" reads as "same as the field," not as "set
            to empty." Same card/badge/full-width-input shell as CoreFieldRecord's Add/Edit
            Field form (see its own module doc) — this is editing a field too, just scoped to
            one group's overrides instead of the field itself. */}
        {fieldsView === FieldsView.Customize && editingField && (
          <>
            <Typography.Text className={styles.description}>
              {intl.formatMessage({
                id: 'checklist-field-group-menu.customize-field-description',
                defaultMessage:
                  'Only for this group — the field itself, and every other group using it, stays as it is.',
              })}
            </Typography.Text>

            <div className={styles.formCard}>
              <div className={styles.formRow}>
                <List.ItemMeta
                  noPaddingHorizontal
                  logo={
                    <div className={styles.fieldIconBadge}>
                      <Icon width={18} icon="solar:text-field-linear" />
                    </div>
                  }
                  title={intl.formatMessage({
                    id: 'checklist-field-group-menu.customize-name',
                    defaultMessage: 'Name',
                  })}
                />
                <Input
                  value={overrideForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverrideForm({ ...overrideForm, title: e.target.value })
                  }
                  placeholder={editingField.title}
                  border="dash"
                  renderRightInput={() => <></>}
                  className={styles.rowInput}
                />
              </div>

              {editingField.type === 'number' && (
                <div className={styles.formRow}>
                  <List.ItemMeta
                    noPaddingHorizontal
                    logo={
                      <div className={styles.fieldIconBadge}>
                        <Icon width={18} icon="solar:target-linear" />
                      </div>
                    }
                    title={intl.formatMessage({
                      id: 'checklist-field-group-menu.customize-default-value',
                      defaultMessage: 'Default Value',
                    })}
                  />
                  <Input
                    type="number"
                    value={overrideForm.defaultValue === undefined ? '' : String(overrideForm.defaultValue)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setOverrideForm({
                        ...overrideForm,
                        defaultValue: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder={
                      editingField.defaultValue === undefined ? '' : String(editingField.defaultValue)
                    }
                    border="dash"
                    renderRightInput={() => <></>}
                    className={styles.rowInput}
                  />
                </div>
              )}

              <div className={cx(styles.formRow, styles.formRowLast)}>
                <List.ItemMeta
                  noPaddingHorizontal
                  logo={
                    <div className={styles.fieldIconBadge}>
                      <Icon width={18} icon="solar:document-text-linear" />
                    </div>
                  }
                  title={intl.formatMessage({
                    id: 'checklist-field-group-menu.customize-placeholder',
                    defaultMessage: 'Placeholder',
                  })}
                />
                <Input
                  value={overrideForm.placeholder}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setOverrideForm({ ...overrideForm, placeholder: e.target.value })
                  }
                  placeholder={intl.formatMessage({
                    id: 'checklist-field-group-menu.customize-placeholder-hint',
                    defaultMessage: 'Hint text shown in the submit input',
                  })}
                  border="dash"
                  renderRightInput={() => <></>}
                  className={styles.rowInput}
                />
              </div>
            </div>

            <IconPicker
              selectedIcon={overrideForm.icon}
              setSelectedIcon={icon => setOverrideForm({ ...overrideForm, icon })}
              selectedColor={overrideForm.iconColor}
              setSelectedColor={iconColor => setOverrideForm({ ...overrideForm, iconColor })}
            />
          </>
        )}
      </DialogModal>

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
              'This hides "{{title}}" and its fields from the task. Nothing recorded through it is deleted, and you can restore it later from General Settings → Archived Groups.',
          },
          { title: fieldGroup.title || 'this group' },
        )}
      />
    </>
  );
});

ChecklistFieldGroupMenu.displayName = 'ChecklistFieldGroupMenu';

export default ChecklistFieldGroupMenu;
