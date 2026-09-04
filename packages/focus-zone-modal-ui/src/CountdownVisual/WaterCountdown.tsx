import React from 'react';
import { motion } from 'framer-motion';
import styles from './CountdownVisual.module.scss';
import type { CountdownVisualProps } from './types';

/** Water rising in a circular vessel as the pomodoro progresses, with a gently drifting wave
 *  crest while running. Viewbox is 0-120 (matching CircleCountdown's own), water clipped to a
 *  54-radius circle so it lines up with the same outline every other visual uses. */
const WaterCountdown = ({ progress, isRunning }: CountdownVisualProps) => {
  // Water surface Y position — 6 (nearly full, near the top of the 6..114 clip range) down to
  // 114 (empty) as progress goes 0 -> 100.
  const level = 114 - (108 * progress) / 100;

  return (
    <svg className={styles.visualSvg} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="54" className={styles.outline} />
      <defs>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
        <clipPath id="waterClip">
          <circle cx="60" cy="60" r="52" />
        </clipPath>
      </defs>
      <g clipPath="url(#waterClip)">
        <motion.g
          initial={false}
          animate={{ y: level }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <rect x="0" y="0" width="120" height="120" className={styles.waterFill} />
          <motion.path
            d="M -20 -4 Q 5 -9 30 -4 T 80 -4 T 130 -4 T 180 -4 V 4 H -20 Z"
            className={styles.waterWave}
            animate={isRunning ? { x: [-60, 0] } : { x: 0 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.g>
      </g>
    </svg>
  );
};

export default WaterCountdown;
