import React from 'react';
import { motion } from 'framer-motion';
import styles from './CountdownVisual.module.scss';
import type { CountdownVisualProps } from './types';

const STEM_LENGTH = 60;

/** A seedling that grows taller and sprouts leaves/a flower as the pomodoro progresses — the
 *  same "progress reads as growth" idea focus apps like Forest use. Gently sways while running. */
const PlantCountdown = ({ progress, isRunning }: CountdownVisualProps) => {
  const grown = (STEM_LENGTH * progress) / 100;

  return (
    <svg className={styles.visualSvg} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="plantGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#764ba2" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="103" rx="28" ry="6" className={styles.soil} />

      <motion.g
        style={{ transformOrigin: '60px 100px' }}
        animate={isRunning ? { rotate: [-2, 2, -2] } : { rotate: 0 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.path
          d="M60,100 C58,85 62,65 60,42"
          className={styles.stem}
          strokeDasharray={STEM_LENGTH}
          initial={false}
          animate={{ strokeDashoffset: STEM_LENGTH - grown }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />

        {progress > 25 && (
          <motion.path
            d="M60,86 C48,84 42,76 40,68 C52,68 60,76 60,86 Z"
            className={styles.leaf}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ transformOrigin: '60px 86px' }}
            transition={{ duration: 0.4 }}
          />
        )}
        {progress > 55 && (
          <motion.path
            d="M60,68 C72,66 78,58 80,50 C68,50 60,58 60,68 Z"
            className={styles.leaf}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ transformOrigin: '60px 68px' }}
            transition={{ duration: 0.4 }}
          />
        )}
        {progress > 85 && (
          <motion.circle
            cx="60"
            cy="40"
            r="7"
            className={styles.flower}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ transformOrigin: '60px 40px' }}
            transition={{ duration: 0.4, type: 'spring' }}
          />
        )}
      </motion.g>
    </svg>
  );
};

export default PlantCountdown;
