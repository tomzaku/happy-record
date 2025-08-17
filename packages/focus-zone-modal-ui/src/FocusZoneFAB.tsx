import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.module.scss';

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

  // Check if any timer is running
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
      {/* Main Compact FAB */}
      <motion.div
        className={styles.focusZoneFAB}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Play/Pause Button */}
        {/* <motion.button */}
        {/*   className={styles.fabPlayPauseButton} */}
        {/*   onClick={handlePlayPause} */}
        {/*   whileHover={{ scale: 1.1 }} */}
        {/*   whileTap={{ scale: 0.9 }} */}
        {/* > */}
        {/*   <Icon */}
        {/*     icon={ */}
        {/*       isAnyTimerRunning() */}
        {/*         ? 'material-symbols:pause' */}
        {/*         : 'material-symbols:play-arrow' */}
        {/*     } */}
        {/*     width={16} */}
        {/*     height={16} */}
        {/*   /> */}
        {/* </motion.button> */}

        {/* Time Display */}
        <div
          onClick={handlePlayPause}
          className={styles.fabTime}>
          {getCurrentTimeDisplay()}
        </div>

        {/* Hamburger Menu Button */}
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

      {/* Expandable Menu */}
      <AnimatePresence>
        {isMenuExpanded && (
          <motion.div
            className={styles.fabExpandedMenu}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Zoom/Expand Button */}
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

            {/* Reset Button */}
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

            {/* Music Player Button */}
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
