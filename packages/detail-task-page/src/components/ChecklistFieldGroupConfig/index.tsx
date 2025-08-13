import React from 'react';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import Input from '@moon-ui/input';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import { ChecklistFieldGroupTab } from '../ChecklistFieldGroupHeader';
import { FieldGroup } from '@dreamer/global';

import styles from './index.module.scss';

interface ChecklistFieldGroupConfigProps {
  fieldGroup: FieldGroup;
  onUpdateFieldGroup: (updatedGroup: FieldGroup) => void;
}

const ChecklistFieldGroupConfig = ({
  fieldGroup,
  onUpdateFieldGroup,
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
    onUpdateFieldGroup({
      ...fieldGroup,
      title: groupName.trim(),
      defaultTab,
      activeTabs,
      collapseDefault,
    });
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
            onChange={e => setGroupName(e.target.value)}
            placeholder={intl.formatMessage({
              id: 'checklist-field-group-config.group-name-placeholder',
              defaultMessage: 'Enter group name',
            })}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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
    </div>
  );
};

export default ChecklistFieldGroupConfig;
