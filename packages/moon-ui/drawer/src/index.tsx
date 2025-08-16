import React, { useState, useEffect } from 'react';
import cx from 'classnames';
import { useSpring, animated } from '@react-spring/web';
import { createPortal } from 'react-dom';

import styles from './index.module.scss';

type Props = {
  children: React.ReactNode;
  visible: boolean;
  className?: string;
  onBlur?: () => void;
};

export default function Drawer({
  children,
  visible,
  className,
  onBlur,
}: Props) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
    }
  }, [visible]);

  const animationStyles = useSpring({
    translateY: visible ? 0 : 100,
    opacity: visible ? 1 : 0,
    onRest: () => {
      if (!visible) {
        setIsVisible(false);
      }
    },
  });

  if (!visible && !isVisible) {
    return null;
  }

  return createPortal(
    <animated.div
      className={cx(styles.blurContainer, visible && styles.visible)}
      onClick={onBlur}
      style={{
        visibility: isVisible ? 'visible' : 'hidden',
        opacity: animationStyles.opacity,
      }}
    >
      <animated.div
        className={cx(styles.container, className)}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{
          transform: animationStyles.translateY.to(y => `translateY(${y}%)`),
          opacity: animationStyles.opacity,
        }}
      >
        {children}
      </animated.div>
    </animated.div>,
    document.getElementById('drawer-global-root'),
  );
}
