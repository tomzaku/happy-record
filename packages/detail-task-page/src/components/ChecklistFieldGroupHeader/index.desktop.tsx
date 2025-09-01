import React from 'react';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import { motion } from 'motion/react';

import styles from './index.desktop.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { ChecklistFieldGroupTab } from './enums';


const ChecklistFieldGroupHeader = ({
  onClickHome,
  onClickHistory,
  onClickAdd,
  onClickMetric,
  onClickConfig,
  activeTab,
  activeTabs = [
    ChecklistFieldGroupTab.Home,
    ChecklistFieldGroupTab.History,
    ChecklistFieldGroupTab.Metric,
    ChecklistFieldGroupTab.Config,
    ChecklistFieldGroupTab.Add,
  ],
  renderTitle = () => null,
  isCollapsed = false,
  onToggleCollapse,
}: {
  onClickHome: () => void;
  onClickHistory: () => void;
  onClickAdd: () => void;
  onClickMetric: () => void;
  onClickConfig: () => void;
  activeTab: ChecklistFieldGroupTab;
  activeTabs?: ChecklistFieldGroupTab[];
  renderTitle?: () => React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const onClickTab = (callback: () => void) => () => {
    if (isCollapsed) {
      onToggleCollapse?.();
    }
    callback();
  };
  const allTabs = [
    {
      icon: 'solar:home-2-line-duotone',
      iconActive: 'solar:home-2-bold',
      onClick: onClickTab(onClickHome),
      isActive: activeTab === ChecklistFieldGroupTab.Home,
      tab: ChecklistFieldGroupTab.Home,
      label: 'Home',
    },
    {
      icon: 'solar:clock-square-broken',
      iconActive: 'solar:clock-square-bold',
      onClick: onClickTab(onClickHistory),
      isActive: activeTab === ChecklistFieldGroupTab.History,
      tab: ChecklistFieldGroupTab.History,
      label: 'History',
    },
    {
      icon: 'solar:chart-square-linear',
      iconActive: 'solar:chart-square-bold',
      onClick: onClickTab(onClickMetric),
      isActive: activeTab === ChecklistFieldGroupTab.Metric,
      tab: ChecklistFieldGroupTab.Metric,
      label: 'Metrics',
    },
    {
      icon: 'material-symbols:add',
      iconActive: 'material-symbols:add',
      onClick: onClickTab(onClickAdd),
      isActive: activeTab === ChecklistFieldGroupTab.Add,
      tab: ChecklistFieldGroupTab.Add,
      label: 'Submit',
    },
    {
      icon: 'solar:settings-line-duotone',
      iconActive: 'solar:settings-bold',
      onClick: onClickTab(onClickConfig),
      isActive: activeTab === ChecklistFieldGroupTab.Config,
      tab: ChecklistFieldGroupTab.Config,
      label: 'Settings',
    },
  ];

  const tabs = allTabs.filter(tab => activeTabs.includes(tab.tab));
  const intl = useIntl();

  return (
    <>
      <div className={styles.container}>
        <div className={styles.left}>
          <div onClick={onToggleCollapse} className={styles.titleContainer}>
            {onToggleCollapse && (
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: isCollapsed ? -180 : 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                className={styles.iconGroup}
              >
                <Icon
                  className={styles.collapseIcon}
                  width={20}
                  icon="solar:alt-arrow-down-line-duotone"
                />
              </motion.div>
            )}
            <Typography.Title level={4} noMargin>
              {renderTitle()}
            </Typography.Title>
          </div>
        </div>
        
        <div className={styles.tabsContainer}>
          {tabs.map(({ icon, iconActive, onClick, isActive, label }, index) => (
            <button
              key={index}
              onClick={onClick}
              className={cx(styles.tab, isActive && styles.active)}
            >
              <Icon
                className={styles.tabIcon}
                width={20}
                icon={isActive ? iconActive : icon}
              />
              <Typography.Text className={styles.tabLabel}>
                {label}
              </Typography.Text>
              <div className={styles.activeIndicator} />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ChecklistFieldGroupHeader;


