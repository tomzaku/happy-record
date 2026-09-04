import React from 'react';
import { motion } from 'framer-motion';
import styles from './CountdownVisual.module.scss';
import type { CountdownVisualProps } from './types';

const TOTAL_BRICKS = 100;

/** A 10x10 grid of 100 bricks, one dropping away roughly every 1% of progress — reading order
 *  (top-left to bottom-right), simplest and most predictable. Unlike the other visuals, this one
 *  fills its own middle, so index.tsx moves the clock display below it instead of centering on
 *  top (see countdownAnimations.ts's own `clockPosition`). */
const BricksCountdown = ({ progress }: CountdownVisualProps) => {
  const remaining = Math.round((TOTAL_BRICKS * (100 - progress)) / 100);

  return (
    <div className={styles.bricksGrid}>
      {Array.from({ length: TOTAL_BRICKS }, (_, index) => {
        const dropped = index >= remaining;
        return (
          <motion.div
            key={index}
            className={styles.brick}
            initial={false}
            animate={
              dropped
                ? { opacity: 0, y: 18, scale: 0.5 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            transition={{ duration: 0.4, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
};

export default BricksCountdown;
