import React from 'react';
import styles from './EmptyChecklistIllustration.module.scss';

/**
 * Replaces the old static "sad face" icon for the no-tasks state — a clipboard that gently
 * floats, with a checkmark that draws itself in on a loop and a couple of twinkling sparkles.
 * Pure CSS/SVG (no framer-motion, no embedded Lottie JSON) for the same reason CountdownVisual
 * avoids both: this is cheap enough to just draw, and it's the only animated thing on this page
 * so a new runtime dependency isn't worth pulling in for it.
 */
const EmptyChecklistIllustration = () => (
  <svg className={styles.illustration} viewBox="0 0 120 120" aria-hidden="true">
    <g className={styles.floatGroup}>
      <rect x="30" y="22" width="60" height="76" rx="10" className={styles.board} />
      <rect x="46" y="15" width="28" height="13" rx="4" className={styles.clip} />
      <line x1="42" y1="48" x2="78" y2="48" className={styles.line} />
      <line x1="42" y1="62" x2="78" y2="62" className={styles.line} />
      <line x1="42" y1="76" x2="64" y2="76" className={styles.line} />
    </g>

    <g className={styles.badge}>
      <circle cx="82" cy="86" r="16" className={styles.badgeCircle} />
      <path d="M75,86 L80,91 L90,79" className={styles.check} />
    </g>

    <circle cx="97" cy="26" r="2.5" className={`${styles.sparkle} ${styles.sparkle1}`} />
    <circle cx="22" cy="34" r="2" className={`${styles.sparkle} ${styles.sparkle2}`} />
    <circle cx="26" cy="88" r="2.5" className={`${styles.sparkle} ${styles.sparkle3}`} />
  </svg>
);

export default EmptyChecklistIllustration;
