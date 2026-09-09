// Swatch color for each CHALLENGE_THEMES entry (useChallenge.tsx) — what
// ChallengeConfigForm's theme picker (checklist-template-shared-page-ui's own invite-page config
// drawer — the only place a challenge's theme is editable; CardShare only ever writes a fixed
// 'classic' default on first share) paints each option with. Just the color, not the label/
// description: those are copy, translated/hardcoded inline where the picker renders, not baked
// into this shared, unlocalized constant. The actual per-theme page CSS (backgrounds, card
// styles, radii) lives in checklist-template-shared-page-ui's own theme.ts, since nothing outside
// that package renders the shared page itself.
import type { ChallengeThemeId } from './useChallenge';

export const CHALLENGE_THEME_SWATCH: Record<ChallengeThemeId, string> = {
  classic: 'linear-gradient(135deg, #0b7dc2, #075a8c)',
  ignite: 'linear-gradient(135deg, #ff7e5f, #feb47b)',
  playful: 'linear-gradient(135deg, #219653, #6d5bd0)',
  dark: 'linear-gradient(135deg, #38bdf8, #818cf8)',
};
