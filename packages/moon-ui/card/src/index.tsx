import cx from 'classnames';

import styles from './index.module.scss';

type Props = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

export default function Card({ children, className, onClick }: Props) {
  return (
    <div onClick={onClick} className={cx(styles.container, className)}>
      {children}
    </div>
  );
}
