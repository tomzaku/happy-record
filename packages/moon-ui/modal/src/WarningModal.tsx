import React from 'react';
import { createPortal } from 'react-dom';

import Button from '@moon-ui/button';
import IconWarning from '@moon-ui/icon/IconWarning';
import Division from '@moon-ui/division';
import { getModalRoot } from './modalRoot';

import styles from './WarningModal.module.scss';
import Typography from '@moon-ui/typography';

type Props = {
  visible: boolean;
  primaryButtonText: string;
  primaryButtonOnClick: () => void;
  secondaryButtonText: string;
  secondaryButtonClick: () => void;
  title: string;
  content?: React.ReactNode;
};

export default function WarningModal({
  visible,
  primaryButtonText,
  secondaryButtonText,
  primaryButtonOnClick,
  secondaryButtonClick,
  content,
  title,
}: Props) {
  if (!visible) return null;
  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <IconWarning className={styles.icon} />
          </div>
          <Typography.Title className={styles.title} level={3} noMargin>
            {title}
          </Typography.Title>
        </div>
        <Division />
        <div className={styles.content}>{content}</div>
        <div className={styles.footer}>
          <Button
            size="lg"
            type="ghost"
            className={styles.secondaryButton}
            onClick={secondaryButtonClick}
          >
            {secondaryButtonText}
          </Button>
          <Button
            onClick={primaryButtonOnClick}
            size="lg"
            className={styles.primaryButton}
          >
            {primaryButtonText}
          </Button>
        </div>
      </div>
    </div>,
    getModalRoot(),
  );
}
