import React from 'react';
import IconBack from '@moon-ui/icon/IconBack';

import styles from './AppHeader.module.scss';
import Typography from '@moon-ui/typography';

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
      <Typography.Title level={4} noMargin>
        {title}
      </Typography.Title>
      <div className={styles.right}>{rightComponent}</div>
    </div>
  );
};

export default MobileHeader;
