import React from 'react';
import { motion } from 'framer-motion';
import styles from '../index.module.scss';
import type { CountdownVisualProps } from './types';

/** The original (and still default) pomodoro visual — extracted verbatim out of index.tsx so the
 *  new alternatives (Water/Plant) could sit alongside it as siblings instead of this
 *  being hardcoded inline. Nothing about its own markup/behavior changed. */
const CircleCountdown = ({ progress, isRunning }: CountdownVisualProps) => {
  const dashOffset = 2 * Math.PI * 54 * (1 - progress / 100);

  return (
    <svg className={styles.circularProgress} viewBox="0 0 120 120" width="350" height="350">
      <circle
        cx="60"
        cy="60"
        r="54"
        strokeWidth="8"
        fill="none"
        className={styles.strokeCircle}
      />
      <motion.circle
        cx="60"
        cy="60"
        r="50"
        fill="#7455b021"
        animate={
          isRunning
            ? {
              scale: [1, 1.3, 1],
            }
            : {}
        }
        transition={
          isRunning
            ? {
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }
            : {}
        }
      />
      <motion.circle
        cx="60"
        cy="60"
        r="54"
        stroke="url(#progressGradient)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${2 * Math.PI * 54}`}
        strokeDashoffset={`${dashOffset}`}
        initial={{ strokeDashoffset: 2 * Math.PI * 54 }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{
          duration: 0.8,
          ease: 'easeInOut',
          type: 'spring',
          stiffness: 100,
          damping: 20,
        }}
        style={{
          transformOrigin: 'center',
          transform: 'rotate(-90deg)',
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
        strokeDashoffset={`${dashOffset}`}
        initial={{ strokeDashoffset: 2 * Math.PI * 54, opacity: 0 }}
        animate={{
          strokeDashoffset: dashOffset,
          opacity: [0, 0.6, 0],
        }}
        transition={{
          duration: 2,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
        }}
        style={{
          transformOrigin: 'center',
          transform: 'rotate(-90deg)',
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
  );
};

export default CircleCountdown;
