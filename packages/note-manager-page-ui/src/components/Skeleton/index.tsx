import styles from './index.module.scss';

type Props = {
  width?: number | string;
  height?: number | string;
  /** Fully rounded — for an avatar/icon-shaped placeholder. */
  circle?: boolean;
  /** Custom corner radius. Ignored when `circle` is set. */
  radius?: number | string;
  className?: string;
};

/**
 * One shimmering placeholder rectangle — same building block challenge-dashboard-page-ui's own
 * Skeleton uses (that package's own `components/Skeleton`), copied rather than shared out of
 * `packages/moon-ui` since nothing there hosts one yet. NoteList's row skeletons and
 * NoteEditorPane's content skeleton both reuse *their own* real layout classes and only swap
 * real content for one of these, so the loading state lines up with what actually renders once
 * the fetch lands — no layout jump, and no bare spinner that tells you something's loading but
 * nothing about the shape of what's coming.
 */
const Skeleton = ({ width = '100%', height = 12, circle, radius, className }: Props) => (
  <span
    className={[styles.skeleton, className].filter(Boolean).join(' ')}
    style={{ width, height, borderRadius: circle ? '50%' : radius }}
  />
);

export default Skeleton;
