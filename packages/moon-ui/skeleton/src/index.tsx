import styles from './index.module.scss';

type Props = {
  width?: number | string;
  height?: number | string;
  /** Fully rounded — for an avatar/icon-shaped placeholder. */
  circle?: boolean;
  /** Custom corner radius. Ignored when `circle` is set. */
  radius?: number | string;
  className?: string;
  /**
   * Default `'surface'` — a light `--text-color` overlay, sized for sitting inside a Card. Pass
   * `'page'` for a skeleton sitting directly on the page background instead: with no Card edge
   * of its own to read against, it needs a stronger overlay than `'surface'` to stay visible.
   */
  tone?: 'surface' | 'page';
};

/**
 * One shimmering placeholder rectangle. A caller reuses its own real layout classes and only
 * swaps real content for one of these, so the loading state lines up with what actually renders
 * once the fetch lands — no layout jump, and no bare spinner that tells you something's loading
 * but nothing about the shape of what's coming.
 */
const Skeleton = ({ width = '100%', height = 12, circle, radius, className, tone = 'surface' }: Props) => (
  <span
    className={[styles.skeleton, tone === 'page' && styles.onPage, className].filter(Boolean).join(' ')}
    style={{ width, height, borderRadius: circle ? '50%' : radius }}
  />
);

export default Skeleton;
