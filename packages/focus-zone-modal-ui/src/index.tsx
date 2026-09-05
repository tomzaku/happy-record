import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import cx from 'classnames';

// UI Components
import { Icon } from '@moon-ui/icon/Icon';
import Typography, { Title, Text } from '@moon-ui/typography';

import MusicControllerMobile from '@dreamer/music-controller-mobile';
import MusicDrawerDesktop from './MusicDrawerDesktop';
import NotificationPermissionModal from './NotificationPermissionModal';
import FocusZoneFAB from './FocusZoneFab';
import FocusZoneThemePicker from './FocusZoneThemePicker';
import { getFocusZoneTheme } from './focusZoneThemes';
import { useFocusZoneTheme } from './useFocusZoneTheme';
import { stopAllSounds } from '@dreamer/music-controller-common';
import CountdownVisual from './CountdownVisual';
import CountdownAnimationPicker from './CountdownAnimationPicker';
import { useCountdownAnimation } from './useCountdownAnimation';
import { getCountdownAnimation } from './countdownAnimations';

// Hooks and utilities
import { usePomodoroGlobalConfig, usePomodoroTitle } from '@dreamer/pomodoro-common';
import { notify } from '@dreamer/notification';
import { useChecklistTemplateDetail, useIsMobile } from '@dreamer/global';

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

interface FocusZoneModalProps {
  visible: boolean;
  taskId?: string;
  taskTitle?: string;
  onDismiss: () => void;
  onOpenModal: () => void;
  // The shared-challenge landing page (checklist-template-shared-page-ui) is
  // a one-off invite screen someone can land on signed out, mid-onboarding —
  // the floating timer button has no business appearing over it.
  hideFab?: boolean;
}

// This will be created dynamically using global config

const FocusZoneModal: React.FC<FocusZoneModalProps> = ({
  visible,
  taskId,
  taskTitle: propTaskTitle,
  onDismiss,
  onOpenModal,
  hideFab
}) => {
  const { pomodoro, shortBreak, longBreak } = usePomodoroGlobalConfig();
  const { template: taskTemplate } = useChecklistTemplateDetail(taskId);

  // Create POMODORO_PHASES dynamically using global config
  const POMODORO_PHASES: PomodoroPhase[] = [
    { type: 'work', duration: pomodoro / 1000, label: 'Work Session' },
    { type: 'break', duration: shortBreak / 1000, label: 'Short Break' },
    { type: 'work', duration: pomodoro / 1000, label: 'Work Session' },
    { type: 'break', duration: shortBreak / 1000, label: 'Short Break' },
    { type: 'work', duration: pomodoro / 1000, label: 'Work Session' },
    { type: 'break', duration: longBreak / 1000, label: 'Long Break' },
  ];

  // Get task information — an explicit `taskTitle` prop always wins (a deliberate override);
  // otherwise derived straight from the real per-id query, no local state/effect to keep in sync.
  const taskTitle = propTaskTitle || taskTemplate?.title || '';

  // Timer states
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>(
    'pomodoro',
  );
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);
  const [pomodoroPhase, setPomodoroPhase] = useState(0);
  const [pomodoroTime, setPomodoroTime] = useState(POMODORO_PHASES[0].duration);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);

  // Music modal state — a right-side drawer on desktop, the existing bottom sheet on mobile
  // (see MusicDrawerDesktop's own comment on why that's a separate component rather than a prop
  // on MusicControllerMobile).
  const [isMusicModalVisible, setIsMusicModalVisible] = useState(false);
  const isMobile = useIsMobile();

  // Focus Zone's own background/ambient-sound theme, and its own dark/light mode for the
  // `default` preset — both local to this modal, never the app-wide theme (see
  // useFocusZoneTheme's own comment on why that used to leak into the rest of the app).
  const { focusZoneTheme, setFocusZoneTheme, isDarkMode, toggleDarkMode } = useFocusZoneTheme();
  const activeFocusZoneTheme = getFocusZoneTheme(focusZoneTheme);
  // A photo preset (Coffee Shop, Forest, ...) always renders dark — its own scrim + every color
  // choice in it assumes the dark `--focus-zone-*` values, and light mode was never designed
  // against a photo backdrop. Only `default` (no photo) actually has a light mode to offer.
  const isPhotoTheme = !!activeFocusZoneTheme.backgroundImage;
  const effectiveIsDarkMode = isPhotoTheme || isDarkMode;

  // The pomodoro ring's own visual style — see countdownAnimations.ts.
  const { countdownAnimation, setCountdownAnimation } = useCountdownAnimation();
  // 'bricks' fills its own middle (a 10x10 grid), so its clock reads below the visual instead of
  // centered on top of it, unlike every other animation — see countdownAnimations.ts's own
  // `clockPosition` comment.
  const clockPosition = getCountdownAnimation(countdownAnimation).clockPosition ?? 'center';

  // Notification permission modal state
  const [showNotificationPermissionModal, setShowNotificationPermissionModal] =
    useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] =
    useState(false);


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
            const nextPhaseData = POMODORO_PHASES[nextPhase];

            // Show notification when transitioning to break mode
            if (nextPhaseData.type === 'break') {
              notify('Break Time! 🎉', {
                body: `Time to take a ${nextPhaseData.label.toLowerCase()}!`,
                icon: '/logo/dreamer-192x192.png',
                badge: '/logo/dreamer-192x192.png',
                tag: 'pomodoro-break',
                requireInteraction: false,
                silent: false,
              });
            }

            setPomodoroPhase(nextPhase);
            return nextPhaseData.duration;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroTime, pomodoroPhase]);

  // Update HTML title when pomodoro is running
  const currentPhase = POMODORO_PHASES[pomodoroPhase];
  usePomodoroTitle({
    time: pomodoroTime * 1000, // Convert seconds to milliseconds
    isPlaying: isPomodoroRunning && pomodoroTime > 0,
    phaseType: currentPhase.type,
    phaseLabel: currentPhase.label,
    defaultTitle: 'Dreamer'
  });

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

  const togglePomodoro = async () => {
    if (!isPomodoroRunning) {
      // Starting pomodoro, check notification permission
      await checkNotificationPermission();
    }
    setIsPomodoroRunning(!isPomodoroRunning);
  };

  const resetPomodoro = () => {
    setIsPomodoroRunning(false);
    setPomodoroPhase(0);
    setPomodoroTime(POMODORO_PHASES[0].duration);
  };

  // Check and request notification permission
  const checkNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      setHasNotificationPermission(false);
      return false;
    }

    // Permission is 'default', show modal to request
    setShowNotificationPermissionModal(true);
    return false;
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setHasNotificationPermission(true);
        setShowNotificationPermissionModal(false);
        return true;
      } else {
        setHasNotificationPermission(false);
        setShowNotificationPermissionModal(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setHasNotificationPermission(false);
      setShowNotificationPermissionModal(false);
      return false;
    }
  };

  const getCurrentPhase = () => POMODORO_PHASES[pomodoroPhase];
  const getPomodoroProgress = () => {
    const currentPhase = getCurrentPhase();
    const elapsed = currentPhase.duration - pomodoroTime;
    return (elapsed / currentPhase.duration) * 100;
  };



  return (
    <>
      {/* FAB - Show when modal is closed */}
      {!visible && !hideFab && (
        <FocusZoneFAB
          timerMode={timerMode}
          stopwatchTime={stopwatchTime}
          pomodoroTime={pomodoroTime}
          isStopwatchRunning={isStopwatchRunning}
          isPomodoroRunning={isPomodoroRunning}
          onToggleStopwatch={toggleStopwatch}
          onTogglePomodoro={togglePomodoro}
          onResetStopwatch={resetStopwatch}
          onResetPomodoro={resetPomodoro}
          onOpenModal={onOpenModal}
          onOpenMusicPlayer={() => setIsMusicModalVisible(true)}
        />
      )}

      {/* Modal - Show when visible is true */}
      {visible && (
        <>
          {/* Overlay */}
          <div
            className={styles.modalOverlay}
            onClick={onDismiss}
          />

          {/* Modal Content */}
          <div
            className={cx(styles.modalContainer, {
              [styles.lightTheme]: !effectiveIsDarkMode,
            })}
            // Overrides `--focus-zone-*` for this element (and everything inside it) with Focus
            // Zone's own local dark/light choice — independent of whatever `data-theme` the app's
            // real root carries. See useFocusZoneTheme's own comment.
            data-theme={effectiveIsDarkMode ? 'dark' : 'light'}
            style={
              activeFocusZoneTheme.backgroundImage
                ? {
                    backgroundImage: `url(${activeFocusZoneTheme.backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
          >
            {/* A photo theme needs a dark scrim for the existing white text/controls to stay
                readable over it — 'default' has none, so this stays out of its way entirely. */}
            {activeFocusZoneTheme.backgroundImage && <div className={styles.themeScrim} />}
            <div
              className={styles.backHeader}
            >
              <div className={styles.backHeaderContent}>
                <Typography.Title level={3} noMargin>Focus Zone</Typography.Title>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <motion.button
                    type="button"
                    className={cx(styles.headerIconButton, styles.headerIconButtonSquare)}
                    onClick={() => setIsMusicModalVisible(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Music"
                    aria-label="Music"
                  >
                    <Icon width={20} icon="material-symbols:music-note" />
                  </motion.button>
                  {/* Quick mute — stops every currently-playing sound without opening the music
                      picker (which also has its own "Mute all" row for the same action). Labeled,
                      unlike its icon-only siblings here, since a bare speaker-off glyph read as
                      ambiguous next to the music-note icon right beside it — same pill as every
                      other header action now, just wider to fit the text. */}
                  <motion.button
                    type="button"
                    className={styles.headerIconButton}
                    onClick={stopAllSounds}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon width={20} icon="material-symbols:volume-off-rounded" />
                    <Typography.Text style={{ fontSize: '13px', fontWeight: 600 }}>
                      Mute
                    </Typography.Text>
                  </motion.button>
                  {/* Only `default` actually has a light mode to offer — a photo preset always
                      renders dark (see isPhotoTheme above), so there's nothing for this to
                      toggle while one's active. */}
                  {!isPhotoTheme && (
                    <motion.button
                      type="button"
                      className={cx(styles.headerIconButton, styles.headerIconButtonSquare)}
                      onClick={toggleDarkMode}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      title={!isDarkMode ? 'Switch to dark' : 'Switch to light'}
                      aria-label={!isDarkMode ? 'Switch to dark' : 'Switch to light'}
                    >
                      <Icon
                        width={20}
                        icon={
                          !isDarkMode
                            ? 'material-symbols:dark-mode'
                            : 'material-symbols:light-mode'
                        }
                      />
                    </motion.button>
                  )}
                  <motion.button
                    type="button"
                    className={cx(styles.headerIconButton, styles.headerIconButtonSquare)}
                    onClick={onDismiss}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Close"
                    aria-label="Close"
                  >
                    <Icon width={20} icon="material-symbols:close" />
                  </motion.button>
                </div>
              </div>
            </div>
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
                    <Typography.Text>Pomodoro</Typography.Text>
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
                    <Typography.Text>Stopwatch</Typography.Text>
                  </button>
                </div>
              </div>

              {/* Pomodoro Progress */}
              {timerMode === 'pomodoro' && (
                <motion.div
                  className={styles.pomodoroProgress}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  {/* Full-screen animated glow — a separate layer from the ring below it, sized
                      and positioned independently (see this class's own comment). */}
                  <div className={styles.pomodoroBackgroundGlow} />
                  <div className={styles.circularProgressContainer}>
                    <CountdownVisual
                      animationId={countdownAnimation}
                      progress={getPomodoroProgress()}
                      isRunning={isPomodoroRunning}
                    />

                    {/* Centered on top of the visual — the default for every animation except
                        'bricks', which renders its own copy below the container instead (see
                        clockPosition above). */}
                    {clockPosition === 'center' && (
                      <div className={styles.clockDisplay}>
                        <div className={styles.timeDisplay} key={pomodoroTime}>
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
                    )}
                  </div>

                  {clockPosition === 'bottom' && (
                    <div className={cx(styles.clockDisplay, styles.clockDisplayBottom)}>
                      <div className={styles.timeDisplay} key={pomodoroTime}>
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
                  )}

                  {taskTitle && (
                    <Title level={2} noMargin className={styles.taskTitle}>
                      {taskTitle}
                    </Title>
                  )}
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
                    <Text className={styles.completedText}>
                      completed
                    </Text>
                  </motion.div>

                  {/* Which visual the ring above renders — see countdownAnimations.ts. */}
                  <CountdownAnimationPicker
                    value={countdownAnimation}
                    onChange={setCountdownAnimation}
                  />
                </motion.div>
              )}

              {/* Timer Display */}

              {timerMode === 'stopwatch' && (
                <div className={styles.timerDisplay}>
                  <Title
                    level={1}
                    className={cx(styles.time, styles.timerDisplayTime)}
                  >
                    {timerMode === 'stopwatch'
                      ? formatStopwatchTime(stopwatchTime)
                      : formatPomodoroTime(pomodoroTime)}
                  </Title>
                </div>
              )}

              {/* Timer Controls */}
              <div className={styles.timerControls}>
                <motion.button
                  className={cx(
                    styles.controlButton,
                    styles.start,
                    styles.controlButtonStart,
                  )}
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
                  className={cx(
                    styles.controlButton,
                    styles.reset,
                    styles.controlButtonReset,
                  )}
                  onClick={timerMode === 'stopwatch' ? resetStopwatch : resetPomodoro}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon icon="material-symbols:refresh" width={20} height={20} />
                  Reset
                </motion.button>
              </div>
            </motion.div>

            {/* Focus Zone theme picker — background photo + ambient sounds, on top of (not
                replacing) the dark/light toggle above. See focusZoneThemes.ts. */}
            <FocusZoneThemePicker value={focusZoneTheme} onChange={setFocusZoneTheme} />
          </div>
        </>
      )}

      {isMobile ? (
        <MusicControllerMobile
          visible={isMusicModalVisible}
          onClickBackButton={() => setIsMusicModalVisible(false)}
        />
      ) : (
        <MusicDrawerDesktop
          visible={isMusicModalVisible}
          onDismiss={() => setIsMusicModalVisible(false)}
        />
      )}

      {/* Notification Permission Modal - Rendered outside Focus Zone Modal */}
      <NotificationPermissionModal
        visible={showNotificationPermissionModal}
        onDismiss={() => setShowNotificationPermissionModal(false)}
        onRequestPermission={requestNotificationPermission}
      />
    </>
  );
};

export default FocusZoneModal;
