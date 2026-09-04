import React from 'react';
import cx from 'classnames';
import { motion } from 'framer-motion';
import { Icon } from '@moon-ui/icon/Icon';
import IconSunny from '@moon-ui/icon/IconSunny';
import IconMoon from '@moon-ui/icon/IconMoon';
import { FOCUS_ZONE_THEMES, FocusZoneThemeId } from './focusZoneThemes';
import styles from './FocusZoneThemePicker.module.scss';

/** The bottom-of-modal row of theme cards — picks the Focus Zone's own background/ambient-sound
 *  mood, on top of (not replacing) the app's own dark/light toggle. `Default` has no photo to
 *  preview (it's exactly today's look), so its card instead renders a real moon/sun split —
 *  the app's own theme-toggle icons (DesktopDrawer's own IconMoon/IconSunny) over each half's
 *  actual background gradient, rather than a flat two-color cut. Every other theme shows its real
 *  background photo as the card's own thumbnail. See focusZoneThemes.ts. */
const FocusZoneThemePicker = ({
  value,
  onChange,
}: {
  value: FocusZoneThemeId;
  onChange: (theme: FocusZoneThemeId) => void;
}) => {
  return (
    <div className={styles.row}>
      {FOCUS_ZONE_THEMES.map(theme => (
        <motion.button
          key={theme.id}
          type="button"
          className={cx(styles.card, value === theme.id && styles.cardActive)}
          style={theme.backgroundImage ? { backgroundImage: `url(${theme.backgroundImage})` } : undefined}
          onClick={() => onChange(theme.id)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          aria-pressed={value === theme.id}
        >
          {!theme.backgroundImage && (
            <div className={styles.defaultPreview}>
              <div className={cx(styles.defaultHalf, styles.defaultHalfDark)}>
                <IconMoon className={styles.defaultIcon} />
              </div>
              <div className={cx(styles.defaultHalf, styles.defaultHalfLight)}>
                <IconSunny className={styles.defaultIcon} />
              </div>
            </div>
          )}
          {value === theme.id && (
            <Icon icon="material-symbols:check-circle" width={16} className={styles.checkIcon} />
          )}
          <span className={styles.label}>{theme.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

export default FocusZoneThemePicker;
