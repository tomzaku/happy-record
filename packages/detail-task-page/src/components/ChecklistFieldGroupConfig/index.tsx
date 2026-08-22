import React from 'react';
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
  const ALL_DAYS = [Day.Sun, Day.Mon, Day.Tue, Day.Wed, Day.Thu, Day.Fri, Day.Sat];
  const [scheduleDays, setScheduleDays] = React.useState<Day[]>(
    fieldGroup.repeat?.dayOfWeek ? getDaysFromRepeat(fieldGroup.repeat) : ALL_DAYS,
  );
  const [scheduleTime, setScheduleTime] = React.useState(
    fieldGroup.repeat?.hour && fieldGroup.repeat?.minute
      ? `${fieldGroup.repeat.hour.padStart(2, '0')}:${fieldGroup.repeat.minute.padStart(2, '0')}`
      : '',
  );

  const handleTabToggle = (tab: ChecklistFieldGroupTab) => {
    const newActiveTabs = activeTabs.includes(tab)
      ? activeTabs.filter(t => t !== tab)
      : [...activeTabs, tab];

    // Ensure at least one tab is always active
    if (newActiveTabs.length > 0) {
      setActiveTabs(newActiveTabs);

      // If the default tab is being removed, set the first remaining tab as default
      if (!newActiveTabs.includes(defaultTab)) {
        setDefaultTab(newActiveTabs[0]);
      }
    }
  };

  const handleSubmit = () => {
    // All 7 days selected is "every day" — same convention as the template-level repeat —
    // stored as no `repeat` at all rather than a redundant dayOfWeek: '0,1,2,3,4,5,6'.
    const full = calculateRepeat({ weeklyHobbies: scheduleDays, selectedTime: scheduleTime });
    const repeat =
      scheduleDays.length === 0 || scheduleDays.length === 7 || !full
        ? undefined
        : { hour: full.hour, minute: full.minute, dayOfWeek: full.dayOfWeek };

    onUpdateFieldGroup({
      ...fieldGroup,
      title: groupName.trim(),
      defaultTab,
      activeTabs,
      collapseDefault,
      repeat,
    });
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

  const tabOptions = [
    {
      value: ChecklistFieldGroupTab.Home,
      label: 'Home',
      icon: 'solar:home-2-line-duotone',
    },
    {
      value: ChecklistFieldGroupTab.History,
      label: 'History',
      icon: 'solar:clock-square-broken',
    },
    {
      value: ChecklistFieldGroupTab.Metric,
      label: 'Metric',
      icon: 'solar:chart-square-linear',
    },
    {
      value: ChecklistFieldGroupTab.Add,
      label: 'Add',
      icon: 'solar:chart-square-linear',
    },
  ];

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
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSubmit()}
            renderRightInput={() => <></>}
          />
        </div>
      </div>

      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.default-tab',
            defaultMessage: 'Default Tab',
          })}
        </Typography.Title>
        <div className={styles.tabOptions}>
          {tabOptions.map(({ value, label, icon }) => (
            <Button
              key={value}
              type={defaultTab === value ? 'primary' : 'dash'}
              size="sm"
              onClick={() => setDefaultTab(value)}
              className={styles.tabOption}
            >
              <Icon icon={icon} width={16} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.active-tabs',
            defaultMessage: 'Active Tabs',
          })}
        </Typography.Title>
        <div className={styles.checkboxGroup}>
          {tabOptions.map(({ value, label, icon }) => (
            <div key={value} className={styles.checkboxItem}>
              <Checkbox
                checked={activeTabs.includes(value)}
                onChange={() => handleTabToggle(value)}
                disabled={activeTabs.length === 1 && activeTabs.includes(value)}
              />
              <Icon icon={icon} width={16} />
              <Typography.Text>{label}</Typography.Text>
            </div>
          ))}
        </div>
      </div>

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
          setValues={setScheduleDays}
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
        <Input
          type="time"
          value={scheduleTime}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleTime(e.target.value)}
          className={styles.scheduleTimeInput}
          renderRightInput={() => <></>}
        />
      </div>

      <div className={styles.section}>
        <Typography.Title level={5} noMargin className={styles.sectionTitle}>
          {intl.formatMessage({
            id: 'checklist-field-group-config.collapse-default',
            defaultMessage: 'Collapse Default',
          })}
        </Typography.Title>
        <div className={styles.collapseSetting}>
          <Checkbox
            checked={collapseDefault}
            onChange={e => setCollapseDefault(e.target.checked)}
          />
          <Typography.Text>
            {intl.formatMessage({
              id: 'checklist-field-group-config.collapse-default-description',
              defaultMessage: 'Start collapsed by default',
            })}
          </Typography.Text>
        </div>
      </div>

      {onSelectedFieldsChange && (
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
      )}

      <div className={styles.section}>
        <Button
          type="primary"
          size="md"
          onClick={handleSubmit}
          className={styles.submitButton}
        >
          {intl.formatMessage({
            id: 'checklist-field-group-config.submit',
            defaultMessage: 'Save Changes',
          })}
        </Button>
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

export default ChecklistFieldGroupConfig;
