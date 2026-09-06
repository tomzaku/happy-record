// The 4th independent widget on the invite page — the "Take the Challenge" CTA button's own
// visual style, owner-picked separately from the other 3 (see StartDateWidget's own comment for
// why each widget gets its own layout picker). Owns all the button's chrome (background, radius,
// shadow, disabled/hover state) — the caller passes only size (via `className`, desktop/mobile
// each have their own padding/font-size) and behavior (onClick/disabled/children).
//
// 'fire' is the classic "gooey" SVG-filter button effect (small blurred circles + a
// feColorMatrix contrast boost merge overlapping shapes into one blobby mass — see
// https://codepen.io/gigacode/pen/ExpozyR, the reference this was built from) rather than a
// plain shifting gradient, which read as "barely different." The filter is applied to a
// `.fireLayer` sitting *behind* the real button (a same-shaped base blob + rising/shrinking
// particles), not to the button itself — the actual button text stays crisp; only the decorative
// layer gets blurred/goo'd. `useId()` gives each instance (the real page button and the config
// drawer's own live preview can both be mounted at once) its own filter id, so two `fire` buttons
// on screen at once don't fight over one `<filter>` element.
import { useId } from 'react';
import cx from 'classnames';
import type { ButtonWidgetLayout } from '@dreamer/global';
import styles from './ButtonWidget.module.scss';

const LAYOUT_CLASS: Record<ButtonWidgetLayout, string> = {
  plain: styles.plain,
  fire: styles.fire,
  water: styles.water,
  colorful: styles.colorful,
};

// left offset (%), animation start delay (s), which of the 6 fireRise keyframes to use — spread
// across the button's width, staggered/varied so the particles read as a continuous flicker
// rather than everything rising in lockstep. Values borrowed loosely from the codepen reference's
// own nth-child delays.
const FIRE_PARTICLES = [
  { left: 4, delay: -0.43, rise: 1 },
  { left: 11, delay: -0.65, rise: 2 },
  { left: 18, delay: 0, rise: 3 },
  { left: 25, delay: -0.9, rise: 4 },
  { left: 32, delay: -0.3, rise: 5 },
  { left: 39, delay: -0.72, rise: 6 },
  { left: 46, delay: -0.84, rise: 1 },
  { left: 53, delay: -0.36, rise: 2 },
  { left: 60, delay: -0.33, rise: 3 },
  { left: 67, delay: -0.96, rise: 4 },
  { left: 74, delay: -0.67, rise: 5 },
  { left: 81, delay: -0.15, rise: 6 },
  { left: 88, delay: -0.55, rise: 1 },
  { left: 95, delay: -0.98, rise: 2 },
];

const FIRE_RISE_CLASS: Record<number, string> = {
  1: styles.fireRise1,
  2: styles.fireRise2,
  3: styles.fireRise3,
  4: styles.fireRise4,
  5: styles.fireRise5,
  6: styles.fireRise6,
};

type Props = {
  layout: ButtonWidgetLayout;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
};

const ButtonWidget = ({ layout, onClick, disabled, children, className }: Props) => {
  // Only needed for 'fire', but calling it unconditionally keeps this a plain hook call (never
  // behind a branch) — the id is simply unused for every other layout.
  const fireFilterId = useId();

  return (
    <span className={styles.wrapper}>
      {layout === 'fire' && (
        <>
          {/* Defs-only SVG, zero footprint — same shape as the codepen reference's own <svg
              class="effects">, just scoped to this instance's own id instead of a page-global one. */}
          <svg width="0" height="0" className={styles.filterDefs} aria-hidden="true">
            <filter id={fireFilterId} x="-100%" y="-300%" width="300%" height="500%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="fire" />
              <feBlend in="SourceGraphic" in2="fire" />
            </filter>
          </svg>
          <span className={styles.fireLayer} style={{ filter: `url(#${fireFilterId})` }} aria-hidden="true">
            <span className={styles.fireBase} />
            {FIRE_PARTICLES.map((p, i) => (
              <span
                key={i}
                className={cx(styles.fireParticle, FIRE_RISE_CLASS[p.rise])}
                style={{ left: `${p.left}%`, animationDelay: `${p.delay}s` }}
              />
            ))}
          </span>
        </>
      )}
      {layout === 'water' && (
        <span className={styles.waterEffect} aria-hidden="true">
          <span className={cx(styles.bubble, styles.bubble1)} />
          <span className={cx(styles.bubble, styles.bubble2)} />
          <span className={cx(styles.bubble, styles.bubble3)} />
          <span className={cx(styles.bubble, styles.bubble4)} />
        </span>
      )}
      <button
        type="button"
        className={cx(styles.button, LAYOUT_CLASS[layout], className)}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </button>
    </span>
  );
};

export default ButtonWidget;
