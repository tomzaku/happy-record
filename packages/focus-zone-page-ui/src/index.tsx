import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import cx from 'classnames';

// UI Components
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import Slider from '@moon-ui/slider';
import { BackHeader } from '@dreamer/header';

// Hooks and utilities
import { useTimer } from '@dreamer/timer-hook';
import { useAudioPlayer } from '@dreamer/music-controller-common/src/hooks';
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

const FOCUS_SOUNDS: FocusSound[] = [
  {
    id: 'forest-rain',
    name: 'Forest Rain',
    description: 'Gentle rain sounds with forest ambience',
    category: 'nature',
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves',
    description: 'Calming ocean waves for deep focus',
    category: 'nature',
  },
  {
    id: 'ambient-flow',
    name: 'Ambient Flow',
    description: 'Ethereal synthesizer soundscapes',
    category: 'ambient',
  },
  {
    id: 'white-noise',
    name: 'White Noise',
    description: 'Clean white noise for concentration',
    category: 'ambient',
  },
];

const POMODORO_PHASES: PomodoroPhase[] = [
  { type: 'work', duration: 25 * 60, label: 'Work Session' },
  { type: 'break', duration: 5 * 60, label: 'Short Break' },
  { type: 'work', duration: 25 * 60, label: 'Work Session' },
  { type: 'break', duration: 5 * 60, label: 'Short Break' },
  { type: 'work', duration: 25 * 60, label: 'Work Session' },
  { type: 'break', duration: 15 * 60, label: 'Long Break' },
];

const FocusZonePage: React.FC = () => {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { theme, setTheme } = usePomodoroGlobalConfig();

  // Timer states
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>(
    'stopwatch',
  );
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState(0);
  const [pomodoroTime, setPomodoroTime] = useState(POMODORO_PHASES[0].duration);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  // Sound states
  const [activeSound, setActiveSound] = useState<FocusSound | null>(null);
  const [soundVolume, setSoundVolume] = useState(70);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);

  // Audio player hook
  const {
    play,
    pause,
    isPlaying: audioIsPlaying,
    currentTime,
    duration,
  } = useAudioPlayer({
    autoPlayDefault: false,
  });

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

  // Sound control functions
  const toggleSound = (sound: FocusSound) => {
    if (activeSound?.id === sound.id) {
      // Toggle current sound
      if (isSoundPlaying) {
        pause();
        setIsSoundPlaying(false);
      } else {
        play();
        setIsSoundPlaying(true);
      }
    } else {
      // Switch to new sound
      setActiveSound(sound);
      setIsSoundPlaying(true);
      // In a real app, you would load and play the new audio file
      // For now, we'll simulate it
      play();
    }
  };

  const handleVolumeChange = (value: number | number[]) => {
    if (typeof value === 'number') {
      setSoundVolume(value);
      // In a real app, you would update the audio volume
    }
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
        )}
        onClickLeftButton={() => navigate(-1)}
      />

      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography.Title level={1} className={styles.title}>
          Focus Zone
        </Typography.Title>
        <Typography.Text className={styles.subtitle}>
          Productivity companion
        </Typography.Text>
      </motion.div>

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
          </div>
        </div>

        {/* Pomodoro Progress */}
        {timerMode === 'pomodoro' && (
          <motion.div
            className={styles.pomodoroProgress}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.4 }}
          >
            <div className={styles.progressBar}>
              <motion.div
                className={styles.progressFill}
                style={{ width: `${getPomodoroProgress()}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${getPomodoroProgress()}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className={styles.phaseInfo}>
              <span className={styles.currentPhase}>
                {getCurrentPhase().label}
              </span>
              <span className={styles.timeRemaining}>
                {formatPomodoroTime(pomodoroTime)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Timer Display */}
        <div className={styles.timerDisplay}>
          <Typography.Title level={1} className={styles.time}>
            {timerMode === 'stopwatch'
              ? formatStopwatchTime(stopwatchTime)
              : formatPomodoroTime(pomodoroTime)}
          </Typography.Title>
        </div>

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

        {/* Instruction */}
        <Typography.Text className={styles.instruction}>
          Touch start to begin timing.
        </Typography.Text>

        {/* Focus Sounds Section */}
        <motion.div
          className={styles.focusSoundsSection}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.bullet} />
            <Typography.Title level={3} className={styles.title}>
              Focus Sounds
            </Typography.Title>
          </div>

          {/* Active Sound Card */}
          {activeSound && (
            <motion.div
              className={cx(styles.soundCard, styles.active)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.soundHeader}>
                <div className={styles.soundInfo}>
                  <Typography.Title level={4} className={styles.soundTitle}>
                    {activeSound.name}
                  </Typography.Title>
                  <Typography.Text className={styles.soundDescription}>
                    {activeSound.description}
                  </Typography.Text>
                </div>
                <div
                  className={cx(styles.soundTag, styles[activeSound.category])}
                >
                  {activeSound.category === 'nature' ? 'N' : 'A'}
                </div>
              </div>
              <div className={styles.soundControls}>
                <motion.button
                  className={cx(styles.playButton, {
                    [styles.playing]: isSoundPlaying,
                    [styles.stopped]: !isSoundPlaying,
                  })}
                  onClick={() => toggleSound(activeSound)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon
                    icon={
                      isSoundPlaying
                        ? 'material-symbols:pause'
                        : 'material-symbols:play-arrow'
                    }
                    width={24}
                    height={24}
                  />
                </motion.button>
                <div className={styles.volumeControl}>
                  <Icon
                    icon="material-symbols:volume-up"
                    width={20}
                    height={20}
                    className={styles.volumeIcon}
                  />
                  <Slider
                    className={styles.volumeSlider}
                    value={soundVolume}
                    onChange={handleVolumeChange}
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className={styles.volumeText}>{soundVolume}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Sound Options */}
          {FOCUS_SOUNDS.map((sound, index) => (
            <motion.div
              key={sound.id}
              className={styles.soundOption}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
              onClick={() => toggleSound(sound)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.playIcon}>
                <Icon
                  icon={
                    activeSound?.id === sound.id && isSoundPlaying
                      ? 'material-symbols:pause'
                      : 'material-symbols:play-arrow'
                  }
                  width={20}
                  height={20}
                />
              </div>
              <div className={styles.soundInfo}>
                <Typography.Text className={styles.soundTitle}>
                  {sound.name}
                </Typography.Text>
                <Typography.Text className={styles.soundDescription}>
                  {sound.description}
                </Typography.Text>
              </div>
              <div className={cx(styles.soundTag, styles[sound.category])}>
                {sound.category === 'nature' ? 'N' : 'A'}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FocusZonePage;
