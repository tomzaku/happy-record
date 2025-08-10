import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import { motion } from 'motion/react';

import styles from './index.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';

export enum ChecklistFieldGroupTab {
  Home,
  History,
  Add,
  Metric,
  Config,
}

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
  const allButtons = [
    {
      icon: 'solar:home-2-line-duotone',
      iconActive: 'solar:home-2-bold',
      onClick: onClickTab(onClickHome),
      isActive: activeTab === ChecklistFieldGroupTab.Home,
      tab: ChecklistFieldGroupTab.Home,
    },
    {
      icon: 'solar:clock-square-broken',
      iconActive: 'solar:clock-square-bold',
      onClick: onClickTab(onClickHistory),
      isActive: activeTab === ChecklistFieldGroupTab.History,
      tab: ChecklistFieldGroupTab.History,
    },
    {
      icon: 'solar:chart-square-linear',
      iconActive: 'solar:chart-square-bold',
      onClick: onClickTab(onClickMetric),
      isActive: activeTab === ChecklistFieldGroupTab.Metric,
      tab: ChecklistFieldGroupTab.Metric,
    },
    {
      icon: 'solar:settings-line-duotone',
      iconActive: 'solar:settings-bold',
      onClick: onClickTab(onClickConfig),
      isActive: activeTab === ChecklistFieldGroupTab.Config,
      tab: ChecklistFieldGroupTab.Config,
    },
  ];

  const buttons = allButtons.filter(button => activeTabs.includes(button.tab));
  const intl = useIntl();
  return (
    <>
      <div className={styles.container}>
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
          <Typography.Title level={4} noMargin className={styles.title}>
            {renderTitle()}
          </Typography.Title>
        </div>
        {buttons.map(({ icon, iconActive, onClick, isActive }, index) => (
          <Icon
            key={index}
            onClick={onClick}
            className={cx(styles.icon, isActive && styles.iconActive)}
            width={24}
            icon={isActive ? iconActive : icon}
          />
        ))}
        {activeTabs.includes(ChecklistFieldGroupTab.Add) && (
          <Button
            className={cx(
              styles.button,
              activeTab === ChecklistFieldGroupTab.Add && styles.buttonActive,
            )}
            type="dash"
            onClick={onClickTab(onClickAdd)}
          >
            <Icon icon="material-symbols:add" className={styles.addIcon} />
            {intl.formatMessage({
              id: 'record-header.add-record',
              defaultMessage: 'Add',
            })}
          </Button>
        )}
      </div>
    </>
  );
};

export default ChecklistFieldGroupHeader;
