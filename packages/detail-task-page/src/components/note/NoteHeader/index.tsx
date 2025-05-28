import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button/src/DefaultButton';

import styles from './index.module.scss';
import cx from 'classnames';
import { NoteTab } from '../Note';
import Typography from '@moon-ui/typography';

const NoteHeader = ({
  onClickHome,
  onClickHistory,
  onClickAdd,
  activeTab,
  renderTitle = () => null,
}: {
  onClickHome: () => void;
  onClickHistory: () => void;
  onClickAdd: () => void;
  activeTab: NoteTab;
  renderTitle?: () => React.ReactNode;
}) => {
  const buttons = [
    {
      icon: 'solar:home-2-line-duotone',
      iconActive: 'solar:home-2-bold',
      onClick: onClickHome,
      isActive: activeTab === NoteTab.Home,
    },
    {
      icon: 'solar:clock-square-broken',
      iconActive: 'solar:clock-square-bold',
      onClick: onClickHistory,
      isActive: activeTab === NoteTab.History,
    },
  ];
  const intl = useIntl();
  return (
    <div className={styles.container}>
      <Typography.Title level={4} noMargin className={styles.title}>
        {renderTitle()}
      </Typography.Title>
      {buttons.map(({ icon, iconActive, onClick, isActive }, index) => (
        <Icon
          key={index}
          onClick={onClick}
          className={cx(styles.icon, isActive && styles.iconActive)}
          width={24}
          icon={isActive ? iconActive : icon}
        />
      ))}
      <Button
        className={cx(
          styles.button,
          activeTab === NoteTab.Add && styles.buttonActive,
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
    </div>
  );
};

export default NoteHeader;
