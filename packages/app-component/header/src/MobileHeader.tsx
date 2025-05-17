import React from 'react';
import IconBack from '@moon-ui/icon/IconBack';

import styles from './AppHeader.module.scss';

type Props = {
  onClickBackButton?: () => void;
  title: string;
  rightComponent?: React.ReactNode;
};

const MobileHeader = ({
  onClickBackButton,
  title,
  rightComponent = null,
}: Props) => {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        {onClickBackButton && <IconBack onClick={onClickBackButton} />}
      </div>
      <div >{title}</div>
      <div className={styles.right}>{rightComponent}</div>
    </div>
  );
};

export default MobileHeader;
