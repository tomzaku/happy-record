import React from 'react';

// Hooks
import { useDrag } from '@use-gesture/react';

// Utils
import cx from 'classnames';
import { a, useSpring, config } from '@react-spring/web';

import styles from './BottomModal.module.scss';

type Props = {
  visible: boolean;
  content?: React.ReactNode;
  onDismiss: () => void;
};

export default function BottomModal({ visible, content, onDismiss }: Props) {
  const height = 300;
  const [{ y }, api] = useSpring(() => ({ y: height }));

  const open = ({ canceled }: { canceled?: boolean } = {}) => {
    // when cancel is true, it means that the user passed the upwards threshold
    // so we change the spring config to create a nice wobbly effect
    api.start({
      y: 0,
      immediate: false,
      config: canceled ? config.wobbly : config.stiff,
    });
  };
  const close = (velocity = 0) => {
    api.start({
      y: height,
      immediate: false,
      config: { ...config.stiff, velocity },
    });
  };
  const bind = useDrag(
    ({
      last,
      velocity: [, vy],
      direction: [, dy],
      movement: [, my],
      cancel,
      canceled,
    }) => {
      // if the user drags up passed a threshold, then we cancel
      // the drag so that the sheet resets to its open position
      if (my < -70) cancel();

      // when the user releases the sheet, we check whether it passed
      // the threshold for it to close, or if we reset it to its open positino
      if (last) {
        if (my > height * 0.5 || (vy > 0.5 && dy > 0)) {
          close(vy);
          onDismiss();
        } else {
          open({ canceled });
        }
      }
      // when the user keeps dragging, we just move the sheet according to
      // the cursor position
      else api.start({ y: my, immediate: true });
    },
    {
      from: () => [0, y.get()],
      filterTaps: true,
      bounds: { top: 0 },
      rubberband: true,
    },
  );

  const display = y.to(py => (py < height ? 'block' : 'none'));

  const bgStyle = {
    opacity: y.to([0, height], [0.4, 0], 'clamp'),
  };
  React.useEffect(() => {
    if (visible) {
      open();
    } else {
      close();
    }
  }, [visible]);
  return (
    <>
      <a.div
        className={cx(styles.overlay, visible && styles.overlayVisible)}
        onClick={() => {
          close();
          onDismiss();
        }}
        style={bgStyle}
      />
      <a.div className={styles.sheet} {...bind()} style={{ display, y }}>
        {content}
      </a.div>
    </>
  );
}
