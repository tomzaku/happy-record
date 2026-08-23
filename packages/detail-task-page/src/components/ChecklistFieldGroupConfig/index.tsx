import React from 'react';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import MultiSelectButton from '@moon-ui/button/src/MultiSelectButton';
import { Day } from '@dreamer/tasks-page-common';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import { FieldGroup, RecordField } from '@dreamer/global';
import AddFieldRecordUi from '../../../../create-checklist-page-ui/src/RecordTaskSetting/AddFieldRecordUi';
import { getDaysFromRepeat } from '../../../../create-checklist-page-ui/src/getDayFromRepeat';
import { calculateRepeat } from '../../../../create-checklist-page-ui/src/calculateRepeat';

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

const ALL_DAYS = [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];

// One entry per tab this group can show. `Config` (this screen itself) is deliberately left out
// — hiding the tab you're currently configuring, or landing on it by default, isn't a choice
// that makes sense to offer from inside it.
const TAB_OPTIONS = [
  { value: ChecklistFieldGroupTab.Home, label: 'Home', icon: 'solar:home-2-line-duotone' },
  { value: ChecklistFieldGroupTab.History, label: 'History', icon: 'solar:clock-square-broken' },
  { value: ChecklistFieldGroupTab.Metric, label: 'Metric', icon: 'solar:chart-square-linear' },
  { value: ChecklistFieldGroupTab.Add, label: 'Add', icon: 'solar:add-square-line-duotone' },
];

// All 7 days selected is "every day" — same convention as the template-level repeat — stored as
// no `repeat` at all rather than a redundant dayOfWeek: '0,1,2,3,4,5,6'. No time-of-day input:
// isFieldGroupActiveOnDay (scheduleUtils.ts) only ever checks the day, never the hour/minute, so
// there's nothing here for a time picker to actually control.
const buildRepeatFromDays = (days: Day[]): FieldGroup['repeat'] => {
  const full = calculateRepeat({ weeklyHobbies: days });
  return days.length === 0 || days.length === 7 || !full
    ? undefined
    : { hour: full.hour, minute: full.minute, dayOfWeek: full.dayOfWeek };
};

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

  // This group's own schedule — independent of the template's `repeat`, so e.g. a "Push Day"
  // group can show Mon/Thu while a "Pull Day" group in the same template shows Tue/Fri. Absent
  // `repeat` (or every day selected) means "every day" — see scheduleUtils.ts's
  // `isFieldGroupActiveOnDay`, which is what actually gates rendering by day.
  const [scheduleDays, setScheduleDays] = React.useState<Day[]>(
    fieldGroup.repeat?.dayOfWeek ? getDaysFromRepeat(fieldGroup.repeat) : ALL_DAYS,
  );

  // Every control on this screen saves the instant it changes — same as field selection below
  // always has — rather than staging edits behind a single "Save Changes" button. A mix of the
  // two within one screen is what made it easy to believe an edit had saved when it hadn't.
  // `overrides` carries whatever just changed; everything else comes from current state, which
  // is why this needs the caller to also pass the new value it just set locally, not rely on the
  // state setter having landed yet.
  const saveGroup = (overrides: Partial<FieldGroup> = {}) => {
    onUpdateFieldGroup({
      ...fieldGroup,
      title: groupName.trim(),
      defaultTab,
      activeTabs,
      collapseDefault,
      repeat: buildRepeatFromDays(scheduleDays),
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

  const handleScheduleDaysChange = (days: Day[]) => {
    setScheduleDays(days);
    saveGroup({ repeat: buildRepeatFromDays(days) });
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
            id: 'checklist-field-group-config.schedule',
            defaultMessage: 'Schedule',
          })}
        </Typography.Title>
        <Typography.Text className={styles.sectionDescription}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.schedule-description',
            defaultMessage: 'When this group is due — independent of the task’s own schedule. Select every day for no restriction.',
          })}
        </Typography.Text>
        <MultiSelectButton
          values={scheduleDays}
          setValues={handleScheduleDaysChange}
          options={[
            { label: 'Mon', value: Day.Mon },
            { label: 'Tue', value: Day.Tue },
            { label: 'Wed', value: Day.Wed },
            { label: 'Thu', value: Day.Thu },
            { label: 'Fri', value: Day.Fri },
            { label: 'Sat', value: Day.Sat },
            { label: 'Sun', value: Day.Sun },
          ]}
        />
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
