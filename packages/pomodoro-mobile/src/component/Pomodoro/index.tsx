import React from 'react';

// Component
import Timer from '../Timer';

// Hooks
import { usePomodoroTimer, usePomodoroTitleFromContext } from '@dreamer/pomodoro-common';

import styles from './index.module.scss';
import SelectTask from '../SelectTask';
import Button3D from '../Button3D';

export default function Pomodoro() {
  const { pomodoroTimer } = usePomodoroTimer();

  // Update HTML title when pomodoro is running
  usePomodoroTitleFromContext('Dreamer');

  return (
    <>
      <div className={styles.body}>
        <Timer time={pomodoroTimer.time} />
        <SelectTask />
      </div>
      <div className={styles.footer}>
        <Button3D
          active={pomodoroTimer.isPlaying}
          onClick={pomodoroTimer.isPlaying ? pomodoroTimer.pause : pomodoroTimer.start}
        >
          {pomodoroTimer.isPlaying ? 'PAUSE' : 'PLAY'}
        </Button3D>
      </div>
    </>
  );
}
