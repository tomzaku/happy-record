import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { getModalRoot } from '@moon-ui/modal/src/modalRoot';
import { useIntl } from '@dreamer/translation';
import { MusicSoundPicker } from '@dreamer/music-controller-mobile';
import styles from './MusicDrawerDesktop.module.scss';

/**
 * Desktop's own take on the music picker — a right-side panel instead of
 * `MusicControllerMobile`'s bottom sheet (that component's `Drawer` is a mobile-shaped,
 * full-viewport-width sheet with no horizontal variant — see @moon-ui/drawer). Reuses the same
 * `MusicSoundPicker` content both share, just wrapped in a slide-from-the-right shell here.
 *
 * Portals into `getModalRoot()` (`#modal-global-root`), not `document.body` directly — that node
 * sits inside `web/src/App.tsx`'s own `data-theme`-carrying `.container`, which is where every
 * `--card-background`/`--drawer-background`/... token this panel reads is actually defined (see
 * `almanac-scope`/theme light-dark.scss). A plain `document.body` portal is a sibling of that
 * `.container`, outside its DOM subtree — every one of those CSS variables comes back unset
 * there, which is why the panel rendered fully transparent before this.
 */
const MusicDrawerDesktop = ({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) => {
  const intl = useIntl();

  return createPortal(
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onDismiss}
          />
          <motion.div
            className={styles.panel}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className={styles.header}>
              <Typography.Title level={4} noMargin>
                {intl.formatMessage({
                  id: 'music-controller-mobile.label-music-title',
                  defaultMessage: 'Music',
                })}
              </Typography.Title>
              <Icon
                onClick={onDismiss}
                width={20}
                icon="basil:close-outline"
                className={styles.closeIcon}
              />
            </div>
            <MusicSoundPicker visible={visible} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    getModalRoot(),
  );
};

export default MusicDrawerDesktop;
