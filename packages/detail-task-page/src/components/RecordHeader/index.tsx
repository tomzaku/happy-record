import { useIntl } from '@dreamer/translation';
import { Icon } from '@iconify/react';
import Button from '@moon-ui/button/src/DefaultButton';

import styles from './index.module.scss';
import cx from 'classnames';
import { RecordTab } from '../RecordDay';

const RecordHeader = ({
  onClickHome,
  onClickHistory,
  onClickMetric,
  onClickAdd,
  activeTab,
  renderTitle = () => null,
}: {
  onClickHome: () => void;
  onClickHistory: () => void;
  onClickMetric: () => void;
  onClickAdd: () => void;
  activeTab: RecordTab;
  renderTitle?: () => React.ReactNode;
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
      <div className={styles.title}>{renderTitle()}</div>
      {buttons.map(({ icon, iconActive, onClick, isActive }, index) => (
        <Icon
          key={index}
          onClick={onClick}
          className={cx(styles.icon, isActive && styles.iconActive)}
          width={24}
          icon={activeTab === index ? iconActive : icon}
        />
      ))}
      <Button className={styles.button} type="dash" onClick={onClickAdd}>
        <Icon icon="material-symbols:add" className={styles.addIcon} />
        {intl.formatMessage({
          id: 'record-header.add-record',
          defaultMessage: 'Add',
        })}
      </Button>
    </div>
  );
};

export default RecordHeader;
