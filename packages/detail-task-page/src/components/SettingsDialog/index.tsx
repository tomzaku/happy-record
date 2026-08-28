import React from 'react';
import { useIntl } from '@dreamer/translation';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { Modal, BottomModal } from '@moon-ui/modal';
import cx from 'classnames';
import { useIsMobile } from '@dreamer/global';

import styles from './index.module.scss';

export type SettingsDialogProps = {
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
 * The one modal shell every settings dialog in the task detail page goes through — a badge +
 * gradient-wash header, a close X (or `headerAction`), Modal on desktop and BottomModal on
 * mobile. Same structural pattern as AiChecklistGenerate's and CardShare's own modals (see
 * either for the fuller reasoning on the device split and why the className is passed to
 * `Modal` directly rather than wrapping `content` in a second box), but slate rather than their
 * purple/pink or blue — this is generic settings, not a marquee feature with its own
 * "signature" color to carry. Originally built for ChecklistFieldGroupMenu's own dialogs, then
 * promoted here so ChecklistGenericInfo's (Icon & Color, Schedule, Tags, Archived Groups) match
 * instead of staying on the older BottomModal-only, no-desktop-treatment look.
 */
const SettingsDialog = ({
  visible,
  onDismiss,
  title,
  icon = 'solar:settings-line-duotone',
  onBack,
  headerAction,
  footer,
  bodyClassName,
  children,
}: SettingsDialogProps) => {
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

export default SettingsDialog;
