import styles from './index.module.scss';

type Props = {
  width?: number | string;
  height?: number | string;
  /** Fully rounded — for an avatar-shaped placeholder. */
  circle?: boolean;
  /** Custom corner radius (e.g. a pill-shaped progress-bar placeholder). Ignored when `circle` is set. */
  radius?: number | string;
  className?: string;
};

/**
 * One shimmering placeholder rectangle — the actual loading-state building
 * block for ChallengeDashboard's per-card skeletons (see index.tsx's
 * `!dashboard` branch). Deliberately just a styled `<span>`, not its own
 * layout: every skeleton card below reuses the *real* cards' own layout
 * classes (`.statBlockRow`, `.rankRow`, `.target`, ...) and only swaps real
 * content for one of these, so the loading state lines up pixel-for-pixel
 * with what actually renders once the fetch lands — no layout jump.
 */
const Skeleton = ({ width = '100%', height = 12, circle, radius, className }: Props) => (
  <span
    className={[styles.skeleton, className].filter(Boolean).join(' ')}
    style={{ width, height, borderRadius: circle ? '50%' : radius }}
  />
);

export default Skeleton;
