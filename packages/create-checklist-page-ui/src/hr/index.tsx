import styles from './index.module.scss';
import cx from 'classnames';

const Hr = ({
  classes,
}: { classes?: { container?: string; hr?: string } } = {}) => {
  return (
    <div className={cx(styles.container, classes?.container)}>
      <div className={cx(styles.hr, classes?.hr)} />
    </div>
  );
};
export default Hr;
