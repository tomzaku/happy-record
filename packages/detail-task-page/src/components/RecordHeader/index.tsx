import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

import styles from './index.module.scss';
import cx from 'classnames';
import { RecordTab } from '../RecordDay';
import Typography from '@moon-ui/typography';

const RecordHeader = ({
  onClickHome,
  onClickHistory,
  onClickMetric,
  onClickAdd,
  activeTab,
  renderTitle = () => null,
  collapsed,
  onToggleCollapse,
}: {
  onClickHome: () => void;
  onClickHistory: () => void;
  onClickMetric: () => void;
  onClickAdd: () => void;
  activeTab: RecordTab;
  renderTitle?: () => React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) => {
  const buttons = [
    {
      icon: 'solar:home-2-line-duotone',
      iconActive: 'solar:home-2-bold',
      onClick: onClickHome,
      isActive: activeTab === RecordTab.Home,
    },
    {
      icon: 'solar:clock-square-broken',
      iconActive: 'solar:clock-square-bold',
      onClick: onClickHistory,
      isActive: activeTab === RecordTab.History,
    },
    {
      icon: 'solar:chart-square-linear',
      iconActive: 'solar:chart-square-bold',
      onClick: onClickMetric,
      isActive: activeTab === RecordTab.Metric,
    },
  ];
  const intl = useIntl();
  return (
    <div className={styles.container}>
      <div className={styles.titleGroup} onClick={onToggleCollapse}>
        <Typography.Title level={4} noMargin className={styles.title}>
          {renderTitle()}
        </Typography.Title>
        <Icon
          className={cx(styles.chevron, collapsed && styles.chevronCollapsed)}
          width={20}
          icon="solar:alt-arrow-down-line-duotone"
        />
      </div>
      {!collapsed && (
        <>
          {buttons.map(({ icon, iconActive, onClick, isActive }, index) => (
            <Icon
              key={index}
              onClick={onClick}
              className={cx(styles.icon, isActive && styles.iconActive)}
              width={24}
              icon={activeTab === index ? iconActive : icon}
            />
          ))}
          <Button
            className={cx(
              styles.button,
              activeTab === RecordTab.Add && styles.buttonActive,
            )}
            type="dash"
            onClick={onClickAdd}
          >
            <Icon icon="material-symbols:add" className={styles.addIcon} />
            {intl.formatMessage({
              id: 'record-header.add-record',
              defaultMessage: 'Add',
            })}
          </Button>
        </>
      )}
    </div>
  );
};

export default RecordHeader;
