import React from 'react';
import { motion } from 'framer-motion';
import indexStyles from '../index.module.scss';
import CircleCountdown from './CircleCountdown';
import WaterCountdown from './WaterCountdown';
import PlantCountdown from './PlantCountdown';
import BricksCountdown from './BricksCountdown';
import type { CountdownVisualProps } from './types';
import type { CountdownAnimationId } from '../countdownAnimations';

const VISUAL_BY_ID: Record<CountdownAnimationId, React.ComponentType<CountdownVisualProps>> = {
  circle: CircleCountdown,
  water: WaterCountdown,
  plant: PlantCountdown,
  bricks: BricksCountdown,
};

/**
 * The pomodoro ring's own visual, swappable per user preference (see countdownAnimations.ts) —
 * `circle` (default) is the original rotating-ring SVG, extracted verbatim into its own
 * component; the rest are hand-built SVG/Framer Motion alternatives rather than embedded
 * third-party Lottie JSON (no reliable way to script-extract a working asset URL from
 * LottieFiles headlessly, plus a new runtime dependency and per-animation licensing to track for
 * something this app can just draw itself).
 *
 * Every visual shares this one hover/tap wrapper (`.progressWrapper`, same as the ring always
 * had) so switching animations doesn't also change that interaction.
 */
const CountdownVisual = ({
  animationId,
  progress,
  isRunning,
}: CountdownVisualProps & { animationId: CountdownAnimationId }) => {
  const Visual = VISUAL_BY_ID[animationId] ?? CircleCountdown;

  return (
    <motion.div
      className={indexStyles.progressWrapper}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Visual progress={progress} isRunning={isRunning} />
    </motion.div>
  );
};

export default CountdownVisual;
