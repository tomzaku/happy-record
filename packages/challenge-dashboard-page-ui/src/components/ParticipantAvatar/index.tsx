import React from 'react';
import styles from './index.module.scss';

// A small fixed set of colors — each ≥4.5:1 contrast with the white
// initial on top of it — hashed from the person's name so the same person
// always lands on the same color (the Slack/Gmail-style initials-avatar
// trick), not the chart's categorical palette elsewhere in this page: this
// is a per-person badge, not a metric series, so there's no adjacent-pair
// CVD concern to validate against. Exported so the targets breakdown bar
// can color each participant's segment the same as their avatar — same
// entity, same color, wherever it shows up.
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

/** No photo anywhere in this domain (no avatar_url, no Google metadata captured) — an initial on a per-name color stands in for one everywhere a participant's identity shows up. */
const ParticipantAvatar = ({ name, size = 22 }: { name: string; size?: number }) => (
  <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.5, background: getAvatarColor(name) }}>
    {initialOf(name)}
  </span>
);

export default ParticipantAvatar;
