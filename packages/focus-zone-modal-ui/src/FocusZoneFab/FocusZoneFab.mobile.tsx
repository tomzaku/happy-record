import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import styles from '../index.module.scss';
import Typography from '@moon-ui/typography';

interface FocusZoneFABProps {
  timerMode: 'stopwatch' | 'pomodoro';
  stopwatchTime: number;
  pomodoroTime: number;
  isStopwatchRunning: boolean;
  isPomodoroRunning: boolean;
  onToggleStopwatch: () => void;
  onTogglePomodoro: () => void;
  onResetStopwatch: () => void;
  onResetPomodoro: () => void;
  onOpenModal: () => void;
  onOpenMusicPlayer: () => void;
}

const FocusZoneFAB: React.FC<FocusZoneFABProps> = ({
  timerMode,
  stopwatchTime,
  pomodoroTime,
  isStopwatchRunning,
  isPomodoroRunning,
  onToggleStopwatch,
  onTogglePomodoro,
  onResetStopwatch,
  onResetPomodoro,
  onOpenModal,
  onOpenMusicPlayer,
}) => {
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // Format time functions
  const formatStopwatchTime = (time: number): string => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    const milliseconds = Math.floor((time % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  const formatPomodoroTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get current time display for FAB
  const getCurrentTimeDisplay = (): string => {
    if (timerMode === 'stopwatch') {
      return formatStopwatchTime(stopwatchTime);
    } else {
      return formatPomodoroTime(pomodoroTime);
    }
  };

  const isAnyTimerRunning = (): boolean => {
    return isStopwatchRunning || isPomodoroRunning;
  };

  const toggleMenu = () => {
    setIsMenuExpanded(!isMenuExpanded);
  };

  const handlePlayPause = () => {
    if (timerMode === 'stopwatch') {
      onToggleStopwatch();
    } else {
      onTogglePomodoro();
    }
  };

  return (
    <div className={styles.fabContainer}>
      <motion.div
        className={styles.focusZoneFAB}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Typography.Text
          onClick={() => {
            onOpenModal();
          }}
          className={styles.fabTime}>
          {getCurrentTimeDisplay()}
        </Typography.Text>

        <motion.button
          className={styles.fabHamburgerButton}
          onClick={toggleMenu}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Icon
            icon="material-symbols:menu"
            width={16}
            height={16}
          />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isMenuExpanded && (
          <motion.div
            className={styles.fabExpandedMenu}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <motion.button
              className={styles.fabMenuItem}
              onClick={() => {
                handlePlayPause();
                setIsMenuExpanded(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon
                icon="solar:play-circle-outline"
                width={16}
                height={16}
              />
              <span>{isAnyTimerRunning() ? "Pause" : "Playing"}</span>
            </motion.button>
            <motion.button
              className={styles.fabMenuItem}
              onClick={() => {
                onOpenModal();
                setIsMenuExpanded(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon
                icon="material-symbols:open-in-full"
                width={16}
                height={16}
              />
              <span>Zoom</span>
            </motion.button>

            <motion.button
              className={styles.fabMenuItem}
              onClick={() => {
                if (timerMode === 'stopwatch') {
                  onResetStopwatch();
                } else {
                  onResetPomodoro();
                }
                setIsMenuExpanded(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon
                icon="material-symbols:refresh"
                width={16}
                height={16}
              />
              <span>Reset</span>
            </motion.button>

            <motion.button
              className={styles.fabMenuItem}
              onClick={() => {
                onOpenMusicPlayer();
                setIsMenuExpanded(false);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon
                icon="material-symbols:music-note"
                width={16}
                height={16}
              />
              <span>Music</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FocusZoneFAB;
