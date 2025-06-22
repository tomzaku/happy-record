import React from 'react';

// Types
import type { UseTimerOutput } from './type';

export const useTimer = ({
  duration,
  step = 1000,
  shouldStop = (timer, step) => timer - step < 0,
  startAtBegin,
}: {
  duration: number;
  step?: number;
  shouldStop?: (timer: number, step: number) => boolean;
  startAtBegin?: boolean;
}): UseTimerOutput => {
  const [time, setTimer] = React.useState(duration);
  const [isPlaying, setIsPlaying] = React.useState(false);
  // let timerInterval = React.useRef<NodeJS.Timer>();
  const timerInterval = React.useRef<unknown>();
  const startTimer = () => {
    if (isPlaying) return;
    setIsPlaying(true);
    timerInterval.current = setInterval(() => {
      setTimer(timer => {
        if (shouldStop(timer, step)) {
          clearInterval(timerInterval.current);
          return timer;
        } else {
          return timer - step;
        }
      });
    }, step);
  };
  const stopTimer = () => {
    setIsPlaying(false);
    setTimer(duration);
    clearInterval(timerInterval.current);
  };

  React.useEffect(() => {
    if (startAtBegin) {
      startTimer();
    }
    return () => {
      clearInterval(timerInterval.current);
    };
  }, []);
  return {
    time,
    isPlaying,
    pause: () => {
      setIsPlaying(false);
      clearInterval(timerInterval.current);
    },
    start: startTimer,
    stop: stopTimer,
  };
};

export { UseTimerOutput };
