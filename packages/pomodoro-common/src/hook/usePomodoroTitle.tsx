import React from 'react';

// Hooks
import { usePomodoroGlobalConfig } from './usePomodoroGlobalConfig';
import { usePomodoroTimer } from './usePomodoroTimer';

// Enums
import { PomodoroPhase } from '../enum';

// Types
interface PomodoroTitleConfig {
  /** The current time in milliseconds */
  time: number;
  /** Whether the timer is currently running */
  isPlaying: boolean;
  /** The current phase type ('work' | 'break') */
  phaseType?: 'work' | 'break';
  /** Custom phase label (optional) */
  phaseLabel?: string;
  /** Default title when timer is not running */
  defaultTitle?: string;
}

/**
 * Custom hook to update the HTML document title with pomodoro timer information
 * 
 * @param config Configuration object containing timer state and display options
 * 
 * @example
 * ```tsx
 * const { time, isPlaying } = usePomodoroTimer();
 * usePomodoroTitle({
 *   time: pomodoroTimer.time,
 *   isPlaying: pomodoroTimer.isPlaying,
 *   phaseType: 'work',
 *   defaultTitle: 'My App'
 * });
 * ```
 */
export const usePomodoroTitle = (config: PomodoroTitleConfig) => {
  const {
    time,
    isPlaying,
    phaseType = 'work',
    phaseLabel,
    defaultTitle = 'Dreamer'
  } = config;

  // Format time for display (MM:SS format)
  const formatTime = React.useCallback((timeInMs: number): string => {
    const minutes = Math.floor(timeInMs / 1000 / 60);
    const seconds = Math.floor((timeInMs / 1000) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get the appropriate emoji for the phase
  const getPhaseEmoji = React.useCallback((type: 'work' | 'break'): string => {
    return type === 'work' ? '🍅' : '☕';
  }, []);

  // Update document title when timer state changes
  React.useEffect(() => {
    if (isPlaying && time > 0) {
      const formattedTime = formatTime(time);
      const emoji = getPhaseEmoji(phaseType);
      const label = phaseLabel || (phaseType === 'work' ? 'Focus Session' : 'Break Time');
      
      document.title = `${emoji} ${formattedTime} - ${label}`;
    } else {
      // Reset title when timer is not running
      document.title = defaultTitle;
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = defaultTitle;
    };
  }, [isPlaying, time, phaseType, phaseLabel, defaultTitle, formatTime, getPhaseEmoji]);
};

/**
 * Enhanced hook that automatically uses the pomodoro timer context and global config
 * This is the recommended way to use the hook with the existing pomodoro system
 * 
 * @param defaultTitle Optional default title when timer is not running
 * 
 * @example
 * ```tsx
 * // Simple usage - automatically detects current phase and timer state
 * usePomodoroTitleFromContext();
 * 
 * // With custom default title
 * usePomodoroTitleFromContext('My App');
 * ```
 */
export const usePomodoroTitleFromContext = (defaultTitle: string = 'Dreamer') => {
  const { pomodoroPhase, pomodoroTimer, shortBreakTimer, longBreakTimer } = usePomodoroTimer();

  // Get current timer based on phase
  const getCurrentTimer = React.useCallback(() => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro:
        return pomodoroTimer;
      case PomodoroPhase.ShortBreak:
        return shortBreakTimer;
      case PomodoroPhase.LongBreak:
        return longBreakTimer;
      default:
        return pomodoroTimer;
    }
  }, [pomodoroPhase, pomodoroTimer, shortBreakTimer, longBreakTimer]);

  // Get phase info
  const getPhaseInfo = React.useCallback(() => {
    switch (pomodoroPhase) {
      case PomodoroPhase.Pomodoro:
        return { type: 'work' as const, label: 'Focus Session' };
      case PomodoroPhase.ShortBreak:
        return { type: 'break' as const, label: 'Short Break' };
      case PomodoroPhase.LongBreak:
        return { type: 'break' as const, label: 'Long Break' };
      default:
        return { type: 'work' as const, label: 'Focus Session' };
    }
  }, [pomodoroPhase]);

  const currentTimer = getCurrentTimer();
  const phaseInfo = getPhaseInfo();

  // Use the main hook with context data
  usePomodoroTitle({
    time: currentTimer.time,
    isPlaying: currentTimer.isPlaying,
    phaseType: phaseInfo.type,
    phaseLabel: phaseInfo.label,
    defaultTitle
  });
};

export default usePomodoroTitle;
