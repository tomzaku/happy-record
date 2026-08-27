import React from 'react';
import { createPortal } from 'react-dom';
import cx from 'classnames';

import Division from '@moon-ui/division';
import Typography from '@moon-ui/typography';
import { getModalRoot } from './modalRoot';

import styles from './Modal.module.scss';

type Props = {
  visible: boolean;
  title?: string;
  content?: React.ReactNode;
  onDismiss?: () => void;
  /** Merged onto the container box itself (padding, width, background, radius, …) — for
   *  content that needs to own its full layout (e.g. a header banner that should reach the
   *  real corners) rather than sitting inset inside the default padded card. Plain content
   *  passed via `content` doesn't need this; the default padding already fits it. */
  className?: string;
};

export default function Modal({ visible, content, onDismiss, title, className }: Props) {
  if (!visible) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={cx(styles.container, className)} onClick={e => {
        e.preventDefault();
        e.stopPropagation()
      }}>
        {title && (
          <>
            <Typography.Title level={3} className={styles.title} noMargin>
              {title}
            </Typography.Title>
            <Division />
          </>
        )}

        {content}
      </div>
    </div>,
    getModalRoot(),
  );
}
