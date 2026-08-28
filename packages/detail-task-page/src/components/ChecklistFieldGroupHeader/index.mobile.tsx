import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';
import { motion } from 'motion/react';

import styles from './index.mobile.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { ChecklistFieldGroupTab } from './enums';

const ChecklistFieldGroupHeader = ({
  onClickHome,
  onClickHistory,
  onClickAdd,
  onClickMetric,
  activeTab,
  activeTabs = [
    ChecklistFieldGroupTab.Home,
    ChecklistFieldGroupTab.History,
    ChecklistFieldGroupTab.Metric,
    ChecklistFieldGroupTab.Add,
  ],
  renderTitle = () => null,
  renderMenu,
  renderStatus,
  isCollapsed = false,
  onToggleCollapse,
}: {
  onClickHome: () => void;
  onClickHistory: () => void;
  onClickAdd: () => void;
  onClickMetric: () => void;
  activeTab: ChecklistFieldGroupTab;
  activeTabs?: ChecklistFieldGroupTab[];
  renderTitle?: () => React.ReactNode;
  /** The group's own settings menu (ChecklistFieldGroupMenu) — always reachable regardless of
   * `activeTabs`, since it isn't a content tab any more (see that component's own doc comment
   * for why `Config` was removed from the tab row entirely). Sits right after the title text,
   * on the title's own row — not vertically centered against the taller block `renderStatus`'s
   * own row adds below it. */
  renderMenu?: () => React.ReactNode;
  /** The group's own schedule status ("Scheduled today" / "Not scheduled today · Next Mon") —
   * its own row under the title, shown either way rather than only when not scheduled. */
  renderStatus?: () => React.ReactNode;
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
  ];

  // `activeTabs` is an ordered list, not just a membership set — mapping over it (rather than
  // filtering `allButtons`' own fixed literal order) is what lets the Tabs dialog's reorder
  // controls (ChecklistFieldGroupMenu's own up/down buttons) actually change render order here.
  // Add itself isn't part of `allButtons` at all (it renders as its own dedicated button below,
  // always last) — reordering only ever applies to Home/History/Metric among each other.
  const buttonsByValue = new Map(allButtons.map(button => [button.tab, button]));
  const buttons = activeTabs
    .map(tab => buttonsByValue.get(tab))
    .filter((button): button is (typeof allButtons)[number] => button !== undefined);
  const intl = useIntl();

  return (
    <>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.titleRow}>
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
            {renderMenu?.()}
          </div>
          {renderStatus && <div className={styles.statusRow}>{renderStatus()}</div>}
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
            <Icon
              icon="material-symbols:add"
              className={cx(
                styles.addIcon,
                activeTab === ChecklistFieldGroupTab.Add &&
                  styles.addIconActive,
              )}
            />
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

