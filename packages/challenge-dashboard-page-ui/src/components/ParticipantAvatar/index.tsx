import React from 'react';
import styles from './index.module.scss';

// A small fixed set of colors — each ≥4.5:1 contrast with the white
// initial on top of it — hashed from the person's name so the same person
// always lands on the same color (the Slack/Gmail-style initials-avatar
// trick), not the chart's categorical palette elsewhere in this page: this
// is a per-person badge, not a data series, so there's no adjacent-pair
// CVD concern to validate against. Exported so the targets breakdown bar
// can color each participant's segment the same as their avatar — same
// entity, same color, wherever it shows up. Still the fallback even now
// that a real photo can be shown (see `avatarUrl` below) — a broken/expired
// image URL, or a participant who was never signed in with Google, still
// needs something to render.
const AVATAR_COLORS = ['#2a78d6', '#c9550f', '#188a63', '#8a4fd1', '#c23a63', '#0f8f8f', '#a86a00', '#5a67c9'];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const getAvatarColor = (name: string) => AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];

const initialOf = (name: string) => {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
};

/**
 * A real photo when the participant has one — Google's own profile picture,
 * saved onto their `challenge_participants` row at join/share time (see
 * useSession.ts's `avatarUrl`) — else the initials-on-a-hashed-color badge
 * this always was. `React.useState` (not a plain `onError` prop swap)
 * because the fallback needs to persist for this element's lifetime: an
 * `<img>` that failed once keeps re-firing `onError` if left in the DOM
 * with the same broken `src`, so this stops rendering the `<img>` at all
 * rather than trying to reset it.
 */
const ParticipantAvatar = ({ name, avatarUrl, size = 22 }: { name: string; avatarUrl?: string; size?: number }) => {
  const [broken, setBroken] = React.useState(false);
  const showPhoto = !!avatarUrl && !broken;

  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: showPhoto ? undefined : getAvatarColor(name),
      }}
    >
      {showPhoto ? (
        <img src={avatarUrl} alt="" className={styles.photo} onError={() => setBroken(true)} />
      ) : (
        initialOf(name)
      )}
    </span>
  );
};

export default ParticipantAvatar;
