// Components
import IconPauseCircle from '@moon-ui/icon/IconPauseCircle';
import IconPlayCircle from '@moon-ui/icon/IconPlayCircle';
import Typography from '@moon-ui/typography';
import IconMusic from '@moon-ui/icon/IconMusic';
import PomodoroPip from '@dreamer/pomodoro-pip';
import Button from '@moon-ui/button';

// Hooks
import { usePomodoroGlobalConfig, usePomodoroTimer, usePomodoroTitleFromContext } from '@dreamer/pomodoro-common';
import { useGlobalTool } from '@dreamer/global-tool-common';
import React from 'react';

// Enums
import { PomodoroPhase } from '@dreamer/pomodoro-common';
import { GlobalTool } from '@dreamer/global-tool-common';
import { Theme } from '@dreamer/pomodoro-common';

// Constants
import { DARK_THEME_PROPS, LIGHT_THEME_PROPS } from '@dreamer/pomodoro-pip';

// Utils
import cx from 'classnames';

import styles from './index.module.scss';
import { requireNotifyPermission } from '@dreamer/notification';
import IconPictureInPicture from '@moon-ui/icon/IconPictureInPicture';

type Props = {
  className?: string;
};

const PomodoroPlayer = ({ className }: Props) => {
  const { pomodoroPhase, pomodoroTimer, shortBreakTimer, longBreakTimer } =
    usePomodoroTimer();
  const { open } = useGlobalTool();
  const { theme, pomodoro, shortBreak, longBreak } = usePomodoroGlobalConfig();
  const isPlaying =
    pomodoroTimer.isPlaying ||
    shortBreakTimer.isPlaying ||
    longBreakTimer.isPlaying;
  const onStart = () => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro: {
        pomodoroTimer.start();
        break;
      }
      case PomodoroPhase.ShortBreak: {
        shortBreakTimer.start();
        break;
      }
      case PomodoroPhase.LongBreak:
      default: {
        longBreakTimer.start();
        break;
      }
    }
  };
  const onPause = () => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro: {
        pomodoroTimer.pause();
        break;
      }
      case PomodoroPhase.ShortBreak: {
        shortBreakTimer.pause();
        break;
      }
      case PomodoroPhase.LongBreak:
      default: {
        longBreakTimer.pause();
        break;
      }
    }
  };

  const getPomodoroPhaseText = () => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro: {
        if (isPlaying) return 'Focusing';
        return 'Focus';
      }
      case PomodoroPhase.ShortBreak: {
        return 'Short Break';
      }
      case PomodoroPhase.LongBreak:
      default: {
        return 'Long Break';
      }
    }
  };

  const getProgress = () => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro: {
        return (pomodoro - pomodoroTimer.time) / pomodoro;
      }
      case PomodoroPhase.ShortBreak: {
        return (shortBreak - shortBreakTimer.time) / shortBreak;
      }
      case PomodoroPhase.LongBreak: {
        return (longBreak - longBreakTimer.time) / longBreak;
      }
    }
  };

  const onClickPlayOrPauseIcon = () => {
    requireNotifyPermission();
    if (isPlaying) {
      onPause();
    } else {
      onStart();
    }
  };
  const progress = getProgress();
  const getMinutes = () => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro: {
        return pomodoro / 1000 / 60;
      }
      case PomodoroPhase.ShortBreak: {
        return shortBreak / 1000 / 60;
      }
      case PomodoroPhase.LongBreak: {
        return longBreak / 1000 / 60;
      }
    }
  };

  // Update HTML title when pomodoro is running
  usePomodoroTitleFromContext('Happy Record');
  return (
    <div
      className={cx(
        styles.container,
        pomodoroPhase !== PomodoroPhase.Pomodoro && styles.containerBreak,
        className
      )}
    >
      {progress > 0 && (
        <div className={styles.progressContainer}>
          <div
            className={styles.progress}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
      <div className={styles.body}>
        {isPlaying ? (
          <IconPauseCircle
            className={styles.icon}
            onClick={onClickPlayOrPauseIcon}
          />
        ) : (
          <IconPlayCircle
            className={styles.icon}
            onClick={onClickPlayOrPauseIcon}
          />
        )}
        <span
          onClick={() => open(GlobalTool.FocusMode)}
          className={styles.pomodoroPhase}
        >
          <Typography.Title level={4} className={styles.pomodoroPhaseText}>
            {getPomodoroPhaseText()}
          </Typography.Title>
          <Typography.Text
            className={styles.time}
          >{`| ${getMinutes()}:00`}</Typography.Text>
        </span>
        <PomodoroPip
        {...(theme === Theme.Light ? LIGHT_THEME_PROPS : DARK_THEME_PROPS)}

        >
          <IconPictureInPicture className={styles.pipIcon} height="24" />
        </PomodoroPip>
        <IconMusic
          className={styles.icon}
          onClick={() => open(GlobalTool.Sound)}
          width="32"
          height="32"
        />
      </div>
    </div>
  );
};

export default PomodoroPlayer;
