import React from 'react';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import { useIsMobile } from '@dreamer/global';

import Modal from './Modal';
import BottomModal from './BottomModal';
import styles from './Dialog.module.scss';

export type DialogProps = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  /** Badge icon in the header — ignored while `onBack` is set, since the back arrow takes the
   *  badge's place there. Defaults to a plain gear, fine for a dialog with nothing more specific
   *  to show (Collapse Default, Tabs); pass something concrete where it reads better (a
   *  calendar for Schedule, a tag for Tags, a palette for Icon & Color). */
  icon?: string;
  /** Shows a back arrow instead of the badge, and calls this instead of `onDismiss` — for a
   *  dialog that drills into a sub-view (ChecklistFieldGroupMenu's Select Fields → Add/Customize)
   *  rather than closing outright. */
  onBack?: () => void;
  /** Replaces the close X with this — most dialogs here save as they go, so "Done" and "close"
   *  are the same action; this puts a labeled button where a plain icon used to be, right in the
   *  header rather than requiring a scroll to a footer. Falls back to the close X when a view has
   *  nothing that reads as "Done" (a sub-view with its own Cancel/Save, say). */
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  /** Escape hatch for content that already brings its own outer padding (ScheduleModalContent's
   *  own `.modalContent` wrapper, say) — merged onto `.body` instead of doubling up on it. */
  bodyClassName?: string;
  children: React.ReactNode;
};

/**
 * The standard dialog shell — a badge + gradient-wash header, a close X (or `headerAction`),
 * `Modal` on desktop and `BottomModal` on mobile, `body`/`footer` with real padding instead of
 * a bare `Modal`'s own minimal `.container`. Reach for this whenever a dialog needs a title,
 * something to close it, and content with proper spacing — a bare `Modal` is for content that
 * already brings its own full layout (its own header treatment, its own padding) and would just
 * fight this shell's.
 *
 * Slate by default rather than any one feature's own signature color (AI's purple/pink, Share's
 * blue) — this is the generic shell, not a marquee feature's own dialog; pass `icon` for
 * something more specific than the default gear. Originally built for
 * detail-task-page's ChecklistFieldGroupMenu, then promoted here (as `SettingsDialog` first, then
 * renamed once it was clear "settings" was never really what this shape was about — a badge/
 * title/close-X header over a padded body and optional footer is just the standard dialog
 * composition, the same one a "New Folder" prompt or any other one-off form dialog needs too, not
 * something specific to settings) so every caller across the app gets the same look rather than
 * each one hand-rolling its own header/body/footer chrome on top of a bare `Modal`.
 */
const Dialog = ({
  visible,
  onDismiss,
  title,
  icon = 'solar:settings-line-duotone',
  onBack,
  headerAction,
  footer,
  bodyClassName,
  children,
}: DialogProps) => {
  const intl = useIntl();
  const isMobile = useIsMobile();

  const content = (
    <>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {onBack ? (
            <button
              type="button"
              className={styles.backButton}
              onClick={onBack}
              aria-label={intl.formatMessage({ id: 'label-back', defaultMessage: 'Back' })}
            >
              <Icon icon="solar:alt-arrow-left-linear" width={20} />
            </button>
          ) : (
            <div className={styles.badge}>
              <Icon width={18} icon={icon} color="#fff" />
            </div>
          )}
          <Typography.Title level={4} noMargin>
            {title}
          </Typography.Title>
        </div>
        {headerAction ?? (
          <Icon onClick={onDismiss} width={20} icon="basil:close-outline" className={styles.closeIcon} />
        )}
      </div>
      <div className={cx(styles.body, bodyClassName)}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </>
  );

  return isMobile ? (
    <BottomModal
      visible={visible}
      onDismiss={onDismiss}
      content={<div className={styles.mobileSheet}>{content}</div>}
    />
  ) : (
    <Modal visible={visible} onDismiss={onDismiss} content={content} className={styles.modalShell} />
  );
};

export default Dialog;
