import React from 'react';
import styles from './Countdown.module.scss';

type CountdownProps = {
  count: number;
  onComplete: () => void;
};

const Countdown = ({ count, onComplete }: CountdownProps) => {
  React.useEffect(() => {
    if (count === 0) {
      const timer = window.setTimeout(() => {
        onComplete();
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [count, onComplete]);

  if (count === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.countdown}>
          <span className={styles.goText}>GO!</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.countdown}>
        <span className={styles.number}>{count}</span>
      </div>
    </div>
  );
};

export default Countdown;

