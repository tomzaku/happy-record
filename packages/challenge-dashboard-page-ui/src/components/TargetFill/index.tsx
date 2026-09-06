import React from 'react';
import styles from '../../index.module.scss';

/**
 * The colored fill inside a target's progress track — animates its width
 * up from 0 to the real percentage right after mount instead of snapping
 * straight to it, so a target genuinely reads as "filling up" rather than
 * just appearing full. A plain `transition: width` on the track itself
 * wouldn't do this: a transition only fires on a value that changes *after*
 * the element's first paint, and setting the real `pct` directly on that
 * first render (a plain inline style, no separate component) is already
 * the final value with nothing left to transition from — needs its own
 * component (not a hook called inside a `.map()` — one per target field,
 * and hooks can't run conditionally/per-iteration like that) so each
 * field's bar gets its own "start at 0, then animate to the real width"
 * state independent of the others.
 */
const TargetFill = ({ pct, children }: { pct: number; children: React.ReactNode }) => {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    // One rAF so the 0%-width first paint actually happens before the real
    // width is set — setting it synchronously in the same tick as mount
    // can get batched into that same first paint, skipping the animation.
    const raf = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div className={styles.targetFill} style={{ width: `${width}%` }}>
      {children}
    </div>
  );
};

export default TargetFill;
