import React from 'react';

// Hooks
import { useTimer } from '@dreamer/timer-hook';

// Utils
import { formatMinuteAndSecond } from '@dreamer/tasks-page-common';
import cx from 'classnames';

// Types
import type { UseTimerOutput } from '@dreamer/timer-hook';

import styles from './index.module.scss';

interface TimerProps {
  /** Duration in milliseconds, defaults to 5000ms (5 seconds) */
  duration?: number;
  /** Callback function called when timer finishes */
  onFinish?: () => void;
  /** Whether to auto-start the timer on mount */
  autoStart?: boolean;
  /** Whether to show the timer display */
  showDisplay?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Whether the timer is disabled */
  disabled?: boolean;
}

const Timer = ({
  duration = 5000, // 5 seconds default
  onFinish,
  autoStart = false,
  showDisplay = true,
  className,
  disabled = false,
}: TimerProps) => {
  const timer: UseTimerOutput = useTimer({
    duration,
    startAtBegin: autoStart,
  });
  const finishedRefCalled = React.useRef(false);

  // Call onFinish when timer reaches 0
  React.useEffect(() => {
    if (timer.time === 0 && onFinish && !finishedRefCalled.current) {
      finishedRefCalled.current = true;
      onFinish();
    }
  }, [timer.time, onFinish]);

  // Format time for display
  const formattedTime = formatMinuteAndSecond(timer.time);
  console.log('>TIMER', timer);

  return (
    <div className={cx(styles.timer, className)}>
      {showDisplay && (
        <div className={styles.timerDisplay}>
          {formattedTime.split('').map((char, index) => (
            <span key={index} className={styles.timerDigit}>
              {char}
            </span>
          ))}
        </div>
      )}
      {/* <div className={styles.timerControls}> */}
      {/*   {!timer.isPlaying ? ( */}
      {/*     <button */}
      {/*       onClick={timer.start} */}
      {/*       disabled={disabled || timer.time === 0} */}
      {/*       className={cx(styles.timerButton, styles.timerStart)} */}
      {/*     > */}
      {/*       Start */}
      {/*     </button> */}
      {/*   ) : ( */}
      {/*     <button */}
      {/*       onClick={timer.pause} */}
      {/*       disabled={disabled} */}
      {/*       className={cx(styles.timerButton, styles.timerPause)} */}
      {/*     > */}
      {/*       Pause */}
      {/*     </button> */}
      {/*   )} */}
      {/*   <button */}
      {/*     onClick={timer.stop} */}
      {/*     disabled={disabled} */}
      {/*     className={cx(styles.timerButton, styles.timerStop)} */}
      {/*   > */}
      {/*     Reset */}
      {/*   </button> */}
      {/* </div> */}
    </div>
  );
};

export default Timer;
