import { Icon } from '@iconify/react';

// Hooks
import { useNavigate } from 'react-router-dom';

import styles from './AppHeader.module.scss';

export const BackHeader = ({
  renderLeftComponent,
  renderRightComponent,
  onClickLeftButton,
}: {
  renderLeftComponent?: () => React.ReactNode;
  renderRightComponent?: () => React.ReactNode;
  onClickLeftButton?: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div
        className={styles.left}
        onClick={onClickLeftButton ? onClickLeftButton : () => navigate(-1)}
      >
        <Icon
          icon="solar:arrow-left-outline"
          width={24}
          className={styles.backIcon}
        />
        {renderLeftComponent?.()}
      </div>
      <div className={styles.right}>{renderRightComponent?.()}</div>
    </div>
  );
};
