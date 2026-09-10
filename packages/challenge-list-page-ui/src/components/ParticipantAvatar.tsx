import React from 'react';
import styles from './ParticipantAvatar.module.scss';

// Same hashed-color-badge idea as challenge-dashboard-page-ui's own ParticipantAvatar (not
// imported directly — each page package stays self-contained, see CLAUDE.md's package-per-domain
// convention) — a small fixed palette, each ≥4.5:1 contrast with the white initial on top, hashed
// from the person's name so the same person always lands on the same color.
const AVATAR_COLORS = ['#2a78d6', '#c9550f', '#188a63', '#8a4fd1', '#c23a63', '#0f8f8f', '#a86a00', '#5a67c9'];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const getAvatarColor = (name: string) => AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length];

const initialOf = (name: string) => {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
};

/** A real photo when the participant has one (their Google profile picture, saved onto
 * `challenge_participants` at join/share time), else the initials-on-a-hashed-color badge. Falls
 * back for the lifetime of this element once an `<img>` fails to load, rather than retrying the
 * same broken `src` on every re-render. */
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
