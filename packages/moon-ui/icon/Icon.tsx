import { Icon as Iconify, IconProps } from '@iconify/react';

import cx from 'classnames';
import styles from './styles.module.scss';

export const Icon = ({ className, ...props }: IconProps) => {
  return <Iconify className={cx(styles.icon, className)} {...props} />;
};

export default Icon;
