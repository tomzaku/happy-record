import React from 'react';
import cx from 'classnames';
import { motion } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import { COUNTDOWN_ANIMATIONS, CountdownAnimationId } from './countdownAnimations';
import styles from './CountdownAnimationPicker.module.scss';

/** Row of icon buttons for the pomodoro ring's own visual style — see countdownAnimations.ts.
 *  Icon-only (unlike FocusZoneThemePicker's photo cards): these are motion, not a background,
 *  so a label under a static glyph is a more honest preview than trying to render a frame of
 *  each animation. */
const CountdownAnimationPicker = ({
  value,
  onChange,
}: {
  value: CountdownAnimationId;
  onChange: (id: CountdownAnimationId) => void;
}) => {
  return (
    <div className={styles.row}>
      {COUNTDOWN_ANIMATIONS.map(animation => (
        <motion.button
          key={animation.id}
          type="button"
          className={cx(styles.button, value === animation.id && styles.buttonActive)}
          onClick={() => onChange(animation.id)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          aria-pressed={value === animation.id}
          title={animation.label}
        >
          <Icon icon={animation.icon} width={18} />
          <span className={styles.label}>{animation.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default CountdownAnimationPicker;
