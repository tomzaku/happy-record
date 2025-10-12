import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';
import MusicControllerDropdown from './MusicControllerDropdown';
import { useAudioStore } from '@dreamer/global';

interface FocusZoneFABProps {
  timerMode: 'stopwatch' | 'pomodoro';
  stopwatchTime: number;
  pomodoroTime: number;
  isStopwatchRunning: boolean;
  isPomodoroRunning: boolean;
  onToggleStopwatch: () => void;
  onTogglePomodoro: () => void;
  onOpenModal: () => void;
}

const FocusZoneFAB: React.FC<FocusZoneFABProps> = ({
  timerMode,
  stopwatchTime,
  pomodoroTime,
  isStopwatchRunning,
  isPomodoroRunning,
  onToggleStopwatch,
  onTogglePomodoro,
  onOpenModal,
}) => {
  const [isMusicDropdownVisible, setIsMusicDropdownVisible] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  
  const { 
    isAnySoundActive, 
    isAnySoundMuted, 
    muteAllActiveSounds, 
    unmuteAllActiveSounds 
  } = useAudioStore();

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


  const handlePlayPause = () => {
    if (timerMode === 'stopwatch') {
      onToggleStopwatch();
    } else {
      onTogglePomodoro();
    }
  };

  const handleMusicToggle = () => {
    setIsMusicDropdownVisible(!isMusicDropdownVisible);
  };

  const handleMuteToggle = () => {
    if (isAnySoundMuted()) {
      unmuteAllActiveSounds();
    } else {
      muteAllActiveSounds();
    }
  };

  const getFabPosition = () => {
    if (fabRef.current) {
      const rect = fabRef.current.getBoundingClientRect();
      return {
        top: rect.top,
        right: window.innerWidth - rect.right,
      };
    }
    return { top: 0, right: 0 };
  };


  return (
    <div className={styles.fabContainer}>
      {/* Main FAB with enhanced controls */}
      <motion.div
        ref={fabRef}
        className={`${styles.focusZoneFAB} ${isAnyTimerRunning() ? styles.running : ''}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Timer Display */}
        <Typography.Text
          onClick={() => {
            onOpenModal();
          }}
          className={`${styles.fabTime} ${isAnyTimerRunning() ? styles.running : ''}`}
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

        {/* Music Control Group */}
        {isAnySoundActive() && (
          <div className={styles.musicControlGroup}>
            {/* Mute Button */}
            <motion.button
              className={`${styles.fabMusicButton} ${isAnySoundMuted() ? styles.musicMuted : ''}`}
              onClick={handleMuteToggle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '28px',
                height: '28px'
              }}
            >
              <Icon
                icon={isAnySoundMuted() ? "solar:volume-cross-outline" : "solar:volume-loud-linear"}
                width={16}
                height={16}
              />
            </motion.button>

            {/* Music Control Button */}
            <motion.button
              className={`${styles.fabMusicButton} ${isAnySoundActive() ? styles.musicPlaying : ''}`}
              onClick={handleMusicToggle}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: '28px',
                height: '28px'
              }}
            >
              <motion.div
                animate={isAnySoundActive() ? {
                  rotate: [0, 5, -5, 5, -5, 0],
                  scale: [1, 1.1, 1, 1.1, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: isAnySoundActive() ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <Icon
                  icon={"material-symbols:music-note"}
                  width={16}
                  height={16}
                />
              </motion.div>
            </motion.button>
          </div>
        )}

        {/* Music Control Button (when no music is active) */}
        {!isAnySoundActive() && (
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
              icon={"material-symbols:music-note"}
              width={18}
              height={18}
            />
          </motion.button>
        )}

      </motion.div>

      {/* Music Controller Dropdown */}
      <MusicControllerDropdown
        visible={isMusicDropdownVisible}
        onClose={() => setIsMusicDropdownVisible(false)}
        position={getFabPosition()}
      />
      </div>
    );
  };

export default FocusZoneFAB;
