import { useLocalStorage } from '@dreamer/global';
import { CountdownAnimationId, DEFAULT_COUNTDOWN_ANIMATION } from './countdownAnimations';

const COUNTDOWN_ANIMATION_KEY = 'focus_zone_countdown_animation';

/** Genuinely local-only, per-device display preference — same shape as useFocusZoneTheme. */
export const useCountdownAnimation = () => {
  const [countdownAnimation, setCountdownAnimation] = useLocalStorage<CountdownAnimationId>(
    COUNTDOWN_ANIMATION_KEY,
    DEFAULT_COUNTDOWN_ANIMATION,
  );
  return { countdownAnimation, setCountdownAnimation };
};
