import React from 'react';
import { createPortal } from 'react-dom';

import Button from '@moon-ui/button';
import IconWarning from '@moon-ui/icon/IconWarning';
import { getMoonPortalRoot } from '@moon-ui/provider';

import styles from './WarningModal.module.scss';
import Typography from '@moon-ui/typography';

type Props = {
  visible: boolean;
  primaryButtonText: string;
  primaryButtonOnClick: () => void;
  secondaryButtonText: string;
  secondaryButtonClick: () => void;
  /** A third, optional middle action — e.g. "Delete today" sitting between "Cancel" and a more
   * drastic "Delete all" — rendered only when both are provided. Outlined rather than filled, so
   * it doesn't compete with the primary button's own emphasis. */
  tertiaryButtonText?: string;
  tertiaryButtonOnClick?: () => void;
  title: string;
  content?: React.ReactNode;
};

export default function WarningModal({
  visible,
  primaryButtonText,
  secondaryButtonText,
  primaryButtonOnClick,
  secondaryButtonClick,
  tertiaryButtonText,
  tertiaryButtonOnClick,
  content,
  title,
}: Props) {
  // Enter confirms, Escape cancels — registered on the capture phase so this runs (and
  // stops the event) before any bubble-phase `window` keydown listener the page underneath
  // already has (e.g. ChecklistDay.desktop.tsx's own j/k/x/d vim-style shortcuts), which
  // would otherwise still see Enter and act on whatever row was focused before this modal
  // opened. Capture order doesn't depend on which listener was attached first the way two
  // bubble-phase listeners on the same target would — the capture phase always runs first.
  React.useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        primaryButtonOnClick();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        secondaryButtonClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, primaryButtonOnClick, secondaryButtonClick]);

  if (!visible) return null;
  // Same header/body/footer shell as AiChecklistGenerate/CardShare's modals — a small icon
  // badge inline with the title on an edge-to-edge tinted header, no hard divider line
  // underneath it. Warning gets its own amber wash (the theme's existing
  // --modal-logo-warning/--modal-button-primary/-secondary) rather than either of those
  // components' own gradients, which are that specific feature's own signature color, not a
  // "nice modal" look to copy verbatim onto a generic confirm/cancel dialog.
  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.badge}>
            <IconWarning className={styles.icon} />
          </div>
          <Typography.Title level={4} noMargin>
            {title}
          </Typography.Title>
        </div>
        <div className={styles.body}>{content}</div>
        <div className={styles.footer}>
          <Button
            size="md"
            type="ghost"
            className={styles.secondaryButton}
            onClick={secondaryButtonClick}
          >
            {secondaryButtonText}
          </Button>
          {tertiaryButtonText && tertiaryButtonOnClick && (
            <Button
              size="md"
              type="ghost"
              className={styles.tertiaryButton}
              onClick={tertiaryButtonOnClick}
            >
              {tertiaryButtonText}
            </Button>
          )}
          <Button
            onClick={primaryButtonOnClick}
            size="md"
            className={styles.primaryButton}
          >
            {primaryButtonText}
          </Button>
        </div>
      </div>
    </div>,
    getMoonPortalRoot(),
  );
}
