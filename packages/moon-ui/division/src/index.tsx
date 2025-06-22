import styles from './index.module.scss';
import cx from 'classnames';

type Props = {
  className?: string;
};

export default function Division({ className }: Props) {
  return <hr className={cx(styles.container, className)} />;
}
