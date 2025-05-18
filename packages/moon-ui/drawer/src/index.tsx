import React, { useState, useEffect } from 'react';
import cx from 'classnames';
import { useSpring, animated } from '@react-spring/web';

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
    translateX: visible ? -100 : 0,
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

  return (
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
        style={{
          transform: animationStyles.translateX.to(x => `translateY(${x}%)`),
          opacity: animationStyles.opacity,
        }}
        onBlur={onBlur}
      >
        {children}
      </animated.div>
    </animated.div>
  );
}
