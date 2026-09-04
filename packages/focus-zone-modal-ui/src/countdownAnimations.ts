// The pomodoro ring's own visual style is now pickable — `circle` is exactly today's rotating
// SVG ring (default, unchanged), the rest are hand-built SVG/CSS alternatives rather than
// embedded third-party Lottie JSON (see CountdownVisual's own doc comment for why: no reliable
// way to script-extract a working asset URL from LottieFiles, plus a new runtime dependency and
// per-animation licensing to track for something this app can just draw itself).
//
// Stopwatch mode never had a ring at all (see index.tsx's own `.timerDisplay` branch) and still
// doesn't — this only ever swaps out pomodoro mode's own visual.

export type CountdownAnimationId = 'circle' | 'water' | 'plant' | 'bricks';

export type CountdownAnimationOption = {
  id: CountdownAnimationId;
  label: string;
  /** Picker icon — Iconify name, not a preview image (these are motion, not a photo). */
  icon: string;
  /**
   * Where the digits/phase label render relative to the visual — every visual so far centers
   * them on top of itself (`'center'`, the default below), which works because the ring/water/
   * plant all leave the middle mostly clear. `bricks`' own 10x10 grid fills that space, so its
   * own text sits below the grid instead (`'bottom'`) — see index.tsx's own clockPosition.
   */
  clockPosition?: 'center' | 'bottom';
};

export const COUNTDOWN_ANIMATIONS: CountdownAnimationOption[] = [
  { id: 'circle', label: 'Circle', icon: 'material-symbols:donut-large' },
  { id: 'water', label: 'Water', icon: 'material-symbols:water-drop' },
  { id: 'plant', label: 'Plant', icon: 'material-symbols:eco' },
  { id: 'bricks', label: 'Bricks', icon: 'material-symbols:grid-view', clockPosition: 'bottom' },
];

export const DEFAULT_COUNTDOWN_ANIMATION: CountdownAnimationId = 'circle';

export const getCountdownAnimation = (id: CountdownAnimationId): CountdownAnimationOption =>
  COUNTDOWN_ANIMATIONS.find(animation => animation.id === id) ?? COUNTDOWN_ANIMATIONS[0];
