import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.desktop.module.scss';
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
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(50);

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

  const handleMusicToggle = () => {
    setIsMusicPlaying(!isMusicPlaying);
    onOpenMusicPlayer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMusicVolume(Number(e.target.value));
  };

  return (
    <div className={styles.fabContainer}>
      {/* Main FAB with enhanced controls */}
      <motion.div
        className={styles.focusZoneFAB}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{ 
          padding: '12px 16px',
        }}
      >
        {/* Timer Display */}
        <Typography.Text
          onClick={() => {
            onOpenModal();
          }}
          className={styles.fabTime}
          style={{ 
            fontSize: '20px',
            fontWeight: '700',
            minWidth: '80px',
            textAlign: 'center'
          }}>
          {getCurrentTimeDisplay()}
        </Typography.Text>

        {/* Quick Play/Pause Button */}
        <motion.button
          className={styles.fabPlayPauseButton}
          onClick={handlePlayPause}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px'
          }}
        >
          <Icon
            icon={isAnyTimerRunning() ? "solar:pause-circle-outline" : "solar:play-circle-outline"}
            width={18}
            height={18}
          />
        </motion.button>

        {/* Music Control Button */}
        <motion.button
          className={styles.fabPlayPauseButton}
          onClick={handleMusicToggle}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px'
          }}
        >
          <Icon
            icon={isMusicPlaying ? "material-symbols:music-note" : "material-symbols:music-off"}
            width={18}
            height={18}
          />
        </motion.button>

        {/* Menu Button */}
        <motion.button
          className={styles.fabHamburgerButton}
          onClick={toggleMenu}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            width: '32px',
            height: '32px'
          }}
        >
          <Icon
            icon="material-symbols:menu"
            width={18}
            height={18}
          />
        </motion.button>
      </motion.div>

      {/* Enhanced Expanded Menu */}
      
    </div>
  );
};

export default FocusZoneFAB;
