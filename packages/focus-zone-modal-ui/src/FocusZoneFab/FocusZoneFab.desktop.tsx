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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '12px 16px',
          minWidth: '200px'
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
            background: isAnyTimerRunning() 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(255, 255, 255, 0.2)',
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
            background: isMusicPlaying 
              ? 'rgba(255, 255, 255, 0.3)' 
              : 'rgba(255, 255, 255, 0.2)',
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
      <AnimatePresence>
        {isMenuExpanded && (
          <motion.div
            className={styles.fabExpandedMenu}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ 
              minWidth: '200px',
              padding: '12px'
            }}
          >
            {/* Timer Controls Section */}
            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '6px', fontWeight: '500' }}>
                TIMER CONTROLS
              </div>
              
              <motion.button
                className={styles.fabMenuItem}
                onClick={() => {
                  handlePlayPause();
                  setIsMenuExpanded(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ marginBottom: '4px' }}
              >
                <Icon
                  icon={isAnyTimerRunning() ? "solar:pause-circle-outline" : "solar:play-circle-outline"}
                  width={16}
                  height={16}
                />
                <span>{isAnyTimerRunning() ? "Pause Timer" : "Start Timer"}</span>
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
                <span>Reset Timer</span>
              </motion.button>
            </div>

            {/* View Controls Section */}
            <div style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '6px', fontWeight: '500' }}>
                VIEW CONTROLS
              </div>
              
              <motion.button
                className={styles.fabMenuItem}
                onClick={() => {
                  onOpenModal();
                  setIsMenuExpanded(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ marginBottom: '4px' }}
              >
                <Icon
                  icon="material-symbols:open-in-full"
                  width={16}
                  height={16}
                />
                <span>Full Screen Mode</span>
              </motion.button>

              <motion.button
                className={styles.fabMenuItem}
                onClick={() => {
                  // Zoom functionality - could be implemented based on requirements
                  setIsMenuExpanded(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon
                  icon="material-symbols:zoom-in"
                  width={16}
                  height={16}
                />
                <span>Zoom In/Out</span>
              </motion.button>
            </div>

            {/* Music Controls Section */}
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '6px', fontWeight: '500' }}>
                MUSIC CONTROLS
              </div>
              
              <motion.button
                className={styles.fabMenuItem}
                onClick={() => {
                  handleMusicToggle();
                  setIsMenuExpanded(false);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ marginBottom: '8px' }}
              >
                <Icon
                  icon={isMusicPlaying ? "material-symbols:music-note" : "material-symbols:music-off"}
                  width={16}
                  height={16}
                />
                <span>{isMusicPlaying ? "Stop Music" : "Play Music"}</span>
              </motion.button>

              {/* Volume Control */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                marginBottom: '4px'
              }}>
                <Icon
                  icon="material-symbols:volume-up"
                  width={14}
                  height={14}
                  style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={handleVolumeChange}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '2px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ 
                  fontSize: '12px', 
                  color: 'rgba(255, 255, 255, 0.7)',
                  minWidth: '30px',
                  textAlign: 'right'
                }}>
                  {musicVolume}%
                </span>
              </div>

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
                  icon="material-symbols:queue-music"
                  width={16}
                  height={16}
                />
                <span>Music Library</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FocusZoneFAB;
