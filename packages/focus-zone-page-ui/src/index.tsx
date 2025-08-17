import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import cx from 'classnames';

// UI Components
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { BackHeader } from '@dreamer/header';
import FocusSoundSection from './FocusSoundSection';
import MusicControllerMobile from '@dreamer/music-controller-mobile';

// Hooks and utilities
import { usePomodoroGlobalConfig, Theme } from '@dreamer/pomodoro-common';

// Styles
import styles from './index.module.scss';

// Types
interface FocusSound {
  id: string;
  name: string;
  description: string;
  category: 'nature' | 'ambient';
  audioUrl?: string;
}

interface PomodoroPhase {
  type: 'work' | 'break';
  duration: number; // in seconds
  label: string;
}

const POMODORO_PHASES: PomodoroPhase[] = [
  { type: 'work', duration: 2 * 60, label: 'Work Session' },
  { type: 'break', duration: 5 * 60, label: 'Short Break' },
  { type: 'work', duration: 25 * 60, label: 'Work Session' },
  { type: 'break', duration: 5 * 60, label: 'Short Break' },
  { type: 'work', duration: 25 * 60, label: 'Work Session' },
  { type: 'break', duration: 15 * 60, label: 'Long Break' },
];

const FocusZonePage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = usePomodoroGlobalConfig();

  // Timer states
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>(
    'pomodoro',
  );
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState(0);
  const [pomodoroTime, setPomodoroTime] = useState(POMODORO_PHASES[0].duration);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  // Music modal state
  const [isMusicModalVisible, setIsMusicModalVisible] = useState(false);

  // Stopwatch timer effect
  useEffect(() => {
    let interval: number;
    if (isStopwatchRunning) {
      interval = window.setInterval(() => {
        setStopwatchTime(prev => prev + 100);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isStopwatchRunning]);

  // Pomodoro timer effect
  useEffect(() => {
    let interval: number;
    if (isPomodoroRunning && pomodoroTime > 0) {
      interval = window.setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            // Phase completed, move to next phase
            const nextPhase = (pomodoroPhase + 1) % POMODORO_PHASES.length;
            setPomodoroPhase(nextPhase);
            return POMODORO_PHASES[nextPhase].duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroTime, pomodoroPhase]);

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

  // Timer control functions
  const toggleStopwatch = () => {
    setIsStopwatchRunning(!isStopwatchRunning);
  };

  const resetStopwatch = () => {
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  const togglePomodoro = () => {
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroPhase(0);
    setPomodoroTime(POMODORO_PHASES[0].duration);
  };


  const toggleTheme = () => {
    setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light);
  };

  const getCurrentPhase = () => POMODORO_PHASES[pomodoroPhase];
  const getPomodoroProgress = () => {
    const currentPhase = getCurrentPhase();
    const elapsed = currentPhase.duration - pomodoroTime;
    return (elapsed / currentPhase.duration) * 100;
  };

  return (
    <div className={styles.container}>
      <BackHeader
        renderLeftComponent={() => <div>Focus Zone</div>}
        renderRightComponent={() => (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Icon
                onClick={() => setIsMusicModalVisible(true)}
                width={24}
                icon="material-symbols:music-note"
                style={{ cursor: 'pointer' }}
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Icon
                onClick={toggleTheme}
                width={24}
                icon={
                  theme === Theme.Light
                    ? 'material-symbols:dark-mode'
                    : 'material-symbols:light-mode'
                }
                style={{ cursor: 'pointer' }}
              />
            </motion.div>
          </div>
        )}
        onClickLeftButton={() => navigate(-1)}
      />

      {/* Timer Section */}
      <motion.div
        className={styles.timerSection}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        {/* Mode Tabs */}
        <div className={styles.tabContainer}>
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tabButton} ${timerMode === 'pomodoro' ? styles.activeTab : ''}`}
              onClick={() => setTimerMode('pomodoro')}
            >
              <Icon
                icon="material-symbols:restaurant"
                width={18}
                height={18}
                style={{ marginRight: '8px' }}
              />
              Pomodoro
            </button>
            <button
              className={`${styles.tabButton} ${timerMode === 'stopwatch' ? styles.activeTab : ''}`}
              onClick={() => setTimerMode('stopwatch')}
            >
              <Icon
                icon="material-symbols:timer"
                width={18}
                height={18}
                style={{ marginRight: '8px' }}
              />
              Stopwatch
            </button>
          </div>
        </div>

        {/* Pomodoro Progress */}
        {timerMode === 'pomodoro' && (
          <motion.div
            className={styles.pomodoroProgress}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className={styles.circularProgressContainer}>
              <motion.div
                className={styles.progressWrapper}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  className={styles.circularProgress}
                  viewBox="0 0 120 120"
                  width="220"
                  height="220"
                >
                  {/* Background circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  {/* Progress circle */}
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - getPomodoroProgress() / 100)}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 54 * (1 - getPomodoroProgress() / 100)
                    }}
                    transition={{
                      duration: 0.8,
                      ease: "easeInOut",
                      type: "spring",
                      stiffness: 100,
                      damping: 20
                    }}
                    style={{
                      transformOrigin: "center",
                      transform: "rotate(-90deg)"
                    }}
                  />
                  {/* Animated glow effect */}
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="54"
                    stroke="rgba(102, 126, 234, 0.3)"
                    strokeWidth="12"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - getPomodoroProgress() / 100)}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 54, opacity: 0 }}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 54 * (1 - getPomodoroProgress() / 100),
                      opacity: [0, 0.6, 0]
                    }}
                    transition={{
                      duration: 2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    style={{
                      transformOrigin: "center",
                      transform: "rotate(-90deg)"
                    }}
                  />
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#667eea" />
                      <stop offset="100%" stopColor="#764ba2" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Clock display inside the circle */}
                <div className={styles.clockDisplay}>
                  <div
                    className={styles.timeDisplay}
                    key={pomodoroTime}
                  >
                    {formatPomodoroTime(pomodoroTime)}
                  </div>
                  <motion.div
                    className={styles.phaseLabel}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                  >
                    {getCurrentPhase().label}
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Progress percentage indicator */}
            <motion.div
              className={styles.progressPercentage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className={styles.percentageText}>
                {Math.round(getPomodoroProgress())}%
              </span>
              <span className={styles.completedText}>completed</span>
            </motion.div>
          </motion.div>
        )}

        {/* Timer Display */}

        {timerMode === 'stopwatch' && (
          <div className={styles.timerDisplay}>
            <Typography.Title level={1} className={styles.time}>
              {timerMode === 'stopwatch'
                ? formatStopwatchTime(stopwatchTime)
                : formatPomodoroTime(pomodoroTime)}
            </Typography.Title>
          </div>
        )}

        {/* Timer Controls */}
        <div className={styles.timerControls}>
          <motion.button
            className={cx(styles.controlButton, styles.start)}
            onClick={
              timerMode === 'stopwatch' ? toggleStopwatch : togglePomodoro
            }
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon
              icon={
                timerMode === 'stopwatch'
                  ? isStopwatchRunning
                    ? 'material-symbols:pause'
                    : 'material-symbols:play-arrow'
                  : isPomodoroRunning
                    ? 'material-symbols:pause'
                    : 'material-symbols:play-arrow'
              }
              width={20}
              height={20}
            />
            {timerMode === 'stopwatch'
              ? isStopwatchRunning
                ? 'Pause'
                : 'Start'
              : isPomodoroRunning
                ? 'Pause'
                : 'Start'}
          </motion.button>
          <motion.button
            className={cx(styles.controlButton, styles.reset)}
            onClick={timerMode === 'stopwatch' ? resetStopwatch : resetPomodoro}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon icon="material-symbols:refresh" width={20} height={20} />
            Reset
          </motion.button>
        </div>

      </motion.div>

      {/* Music Controller Modal */}
      <MusicControllerMobile
        visible={isMusicModalVisible}
        onClickBackButton={() => setIsMusicModalVisible(false)}
      />
    </div>
  );
};

export default FocusZonePage;
