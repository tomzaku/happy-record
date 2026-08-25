// The 3 visual directions a challenge owner can pick in CardShare
// (CHALLENGE_THEMES / ChallengeThemeId in @dreamer/global) — this is the
// other half: what each one actually looks like on this page. Nothing
// outside this package renders the shared page, so unlike
// CHALLENGE_THEME_SWATCH (the single color CardShare's picker needs) this
// lives here, not in the global store.
import * as React from 'react';
import type { ChallengeThemeId } from '@dreamer/global';

export type ChallengeThemeVars = {
  '--ct-page-bg': string;
  '--ct-card-bg': string;
  '--ct-card-border': string;
  '--ct-card-shadow': string;
  '--ct-card-radius': string;
  '--ct-inner-bg': string;
  '--ct-inner-border': string;
  '--ct-accent': string;
  '--ct-button-bg': string;
  '--ct-button-radius': string;
  '--ct-button-shadow': string;
  '--ct-chip-bg': string;
  '--ct-chip-text': string;
  '--ct-divider': string;
  '--ct-pill-active-bg': string;
  '--ct-pill-inactive-border': string;
  '--ct-pill-inactive-text': string;
  '--ct-heading-color': string;
  '--ct-body-text': string;
  '--ct-muted-text': string;
  '--ct-avatar-bg': string;
  '--ct-avatar-radius': string;
  '--ct-nav-text': string;
};

// Classic Trust: the app's own primary blue and card conventions — see
// @moon-ui/app-scss's color.scss/metric.scss (12px card radius, 0 8px 25px
// shadow). Safe default; every existing challenge row is this until the
// owner picks something else (20260825010000_challenge_theme.sql).
const classic: ChallengeThemeVars = {
  '--ct-page-bg': '#fafafa',
  '--ct-card-bg': '#ffffff',
  '--ct-card-border': '1px solid rgba(0,0,0,.06)',
  '--ct-card-shadow': '0 24px 60px rgba(20,30,45,.10)',
  '--ct-card-radius': '20px',
  '--ct-inner-bg': '#fafbfc',
  '--ct-inner-border': '1px solid rgba(0,0,0,.06)',
  '--ct-accent': '#0b7dc2',
  '--ct-button-bg': '#0b7dc2',
  '--ct-button-radius': '14px',
  '--ct-button-shadow': '0 8px 20px rgba(11,125,194,.24)',
  '--ct-chip-bg': '#ceedff',
  '--ct-chip-text': '#075a8c',
  '--ct-divider': '2px dashed rgba(0,0,0,.12)',
  '--ct-pill-active-bg': '#0b7dc2',
  '--ct-pill-inactive-border': '1px solid rgba(0,0,0,.15)',
  '--ct-pill-inactive-text': 'rgba(0,0,0,.35)',
  '--ct-heading-color': '#1a2733',
  '--ct-body-text': 'rgba(0,0,0,.55)',
  '--ct-muted-text': 'rgba(0,0,0,.4)',
  '--ct-avatar-bg': '#0b7dc2',
  '--ct-avatar-radius': '14px',
  '--ct-nav-text': '#334d6e',
};

// Ignite: the warm gradient already used on the old "Take it" button,
// pushed through the whole page — bold, competitive, for streak/fitness
// challenges.
const ignite: ChallengeThemeVars = {
  '--ct-page-bg': 'linear-gradient(165deg,#fff7f2 0%,#ffead9 45%,#ffdcc2 100%)',
  '--ct-card-bg': '#ffffff',
  '--ct-card-border': '1px solid rgba(255,126,95,.18)',
  '--ct-card-shadow': '0 28px 64px rgba(120,50,20,.14)',
  '--ct-card-radius': '24px',
  '--ct-inner-bg': '#fff8f4',
  '--ct-inner-border': '1px solid rgba(255,126,95,.18)',
  '--ct-accent': '#e8603a',
  '--ct-button-bg': 'linear-gradient(to right,#ff7e5f,#feb47b)',
  '--ct-button-radius': '999px',
  '--ct-button-shadow': '0 10px 24px rgba(255,126,95,.32)',
  '--ct-chip-bg': 'linear-gradient(to right,#ff7e5f,#feb47b)',
  '--ct-chip-text': '#ffffff',
  '--ct-divider': '2px dashed rgba(255,126,95,.28)',
  '--ct-pill-active-bg': 'linear-gradient(135deg,#ff7e5f,#feb47b)',
  '--ct-pill-inactive-border': '1.5px solid rgba(255,126,95,.3)',
  '--ct-pill-inactive-text': '#c99a86',
  '--ct-heading-color': '#3a2418',
  '--ct-body-text': '#8a6a58',
  '--ct-muted-text': '#a8846f',
  '--ct-avatar-bg': 'linear-gradient(135deg,#ff7e5f,#feb47b)',
  '--ct-avatar-radius': '16px',
  '--ct-nav-text': '#5c3a2a',
};

// Playful: green + purple, dashed borders throughout (matches the dashed
// division TaskSharedCard already used), rounded/friendly, lower-pressure
// tone for casual habit challenges.
const playful: ChallengeThemeVars = {
  '--ct-page-bg': 'linear-gradient(150deg,#f3f0ff 0%,#eafff2 55%,#fff9eb 100%)',
  '--ct-card-bg': '#ffffff',
  '--ct-card-border': '2px dashed rgba(109,91,208,.2)',
  '--ct-card-shadow': '0 26px 60px rgba(80,60,140,.14)',
  '--ct-card-radius': '28px',
  '--ct-inner-bg': '#faf9ff',
  '--ct-inner-border': '2px dashed rgba(109,91,208,.22)',
  '--ct-accent': '#6d5bd0',
  '--ct-button-bg': '#219653',
  '--ct-button-radius': '999px',
  '--ct-button-shadow': '0 8px 20px rgba(33,150,83,.28)',
  '--ct-chip-bg': '#eae6ff',
  '--ct-chip-text': '#4a3f6b',
  '--ct-divider': '2px dashed rgba(109,91,208,.25)',
  '--ct-pill-active-bg': '#219653',
  '--ct-pill-inactive-border': '1.5px solid rgba(109,91,208,.25)',
  '--ct-pill-inactive-text': '#b0a8cc',
  '--ct-heading-color': '#3a3452',
  '--ct-body-text': '#7a7391',
  '--ct-muted-text': '#9b93b5',
  '--ct-avatar-bg': 'linear-gradient(135deg,#219653,#6d5bd0)',
  '--ct-avatar-radius': '999px',
  '--ct-nav-text': '#4a3f6b',
};

export const CHALLENGE_PAGE_THEMES: Record<ChallengeThemeId, ChallengeThemeVars> = { classic, ignite, playful };

/**
 * Applies a theme's CSS custom properties at the document root, not just
 * this component's own subtree — Drawer (@moon-ui/drawer) portals its
 * content to `#drawer-global-root`, a sibling of the app root, so vars set
 * on a wrapper div here would never reach the Join/Leave drawers. Root-level
 * custom properties cascade to both. Cleans up on unmount so another page
 * mounted right after doesn't inherit a stale theme.
 */
export function useApplyChallengeTheme(themeId: ChallengeThemeId) {
  React.useEffect(() => {
    const vars = CHALLENGE_PAGE_THEMES[themeId] ?? CHALLENGE_PAGE_THEMES.classic;
    const root = document.documentElement;
    const entries = Object.entries(vars) as [string, string][];
    entries.forEach(([key, value]) => root.style.setProperty(key, value));
    return () => {
      entries.forEach(([key]) => root.style.removeProperty(key));
    };
  }, [themeId]);
}
