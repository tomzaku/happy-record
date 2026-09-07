// The 4 visual directions a challenge owner can pick in CardShare
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
  // Comma-separated "R, G, B" triplet (no rgba() wrapper) — the "glass" page-background layout's
  // tint, combined with the owner's own opacity slider value at the call site (index.desktop.tsx's
  // `rgba(var(--ct-glass-tint-rgb), <opacity>)`) rather than baked into a single fixed color, since
  // the opacity itself is a per-challenge number, not one of a theme's fixed values.
  '--ct-glass-tint-rgb': string;
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
  '--ct-glass-tint-rgb': '255, 255, 255',
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
  '--ct-glass-tint-rgb': '255, 255, 255',
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
  '--ct-glass-tint-rgb': '255, 255, 255',
};

// Dark: the odd one out of the 4 — designed to sit on top of the owner's own dark
// pageBackgroundImageUrl (see useApplyChallengeTheme's own comment and
// 20260906060000_challenge_page_background_image_url.sql), not to look good on its own flat
// `--ct-page-bg` the way classic/ignite/playful do. Translucent white card/inner surfaces (not an
// opaque white box, which would look jarring floating over a dark photo) and light text
// throughout, a cool accent that still reads clearly against dark.
const dark: ChallengeThemeVars = {
  '--ct-page-bg': 'linear-gradient(160deg,#0b0c10 0%,#15171d 55%,#1c1f27 100%)',
  '--ct-card-bg': 'rgba(255,255,255,.06)',
  '--ct-card-border': '1px solid rgba(255,255,255,.1)',
  '--ct-card-shadow': '0 24px 60px rgba(0,0,0,.5)',
  '--ct-card-radius': '20px',
  '--ct-inner-bg': 'rgba(255,255,255,.04)',
  '--ct-inner-border': '1px solid rgba(255,255,255,.08)',
  '--ct-accent': '#7dd3fc',
  '--ct-button-bg': 'linear-gradient(to right,#38bdf8,#818cf8)',
  '--ct-button-radius': '14px',
  '--ct-button-shadow': '0 10px 24px rgba(56,189,248,.35)',
  '--ct-chip-bg': 'rgba(125,211,252,.15)',
  '--ct-chip-text': '#7dd3fc',
  '--ct-divider': '2px dashed rgba(255,255,255,.12)',
  '--ct-pill-active-bg': 'linear-gradient(135deg,#38bdf8,#818cf8)',
  '--ct-pill-inactive-border': '1px solid rgba(255,255,255,.15)',
  '--ct-pill-inactive-text': 'rgba(255,255,255,.35)',
  '--ct-heading-color': '#f5f7fa',
  '--ct-body-text': 'rgba(255,255,255,.7)',
  '--ct-muted-text': 'rgba(255,255,255,.5)',
  '--ct-avatar-bg': 'linear-gradient(135deg,#38bdf8,#818cf8)',
  '--ct-avatar-radius': '14px',
  '--ct-nav-text': '#e2e8f0',
  // A white tint here (the other 3 themes' own choice, and --ct-card-bg's own solid-mode tint at
  // its low fixed 6% opacity) only reads as a subtle brighten at low opacity — but the "glass"
  // layout's opacity is a slider the owner can push well past that (the reported case was 57%),
  // where a white fill dominates and looks like a light box floating on a dark page, not a dark
  // frosted pane. Dark, near-#15171d (the page gradient's own middle stop) instead, so raising the
  // slider deepens the panel into the page rather than lightening it.
  '--ct-glass-tint-rgb': '21, 23, 29',
};

export const CHALLENGE_PAGE_THEMES: Record<ChallengeThemeId, ChallengeThemeVars> = { classic, ignite, playful, dark };

/**
 * Applies a theme's CSS custom properties at the document root, not just
 * this component's own subtree — Drawer (@moon-ui/drawer) portals its
 * content to `#moon-ui-portal-root` (@moon-ui/provider), a sibling of the
 * app root, so vars set on a wrapper div here would never reach the
 * Join/Leave drawers. Root-level custom properties cascade to both. Cleans
 * up on unmount so another page mounted right after doesn't inherit a stale
 * theme.
 *
 * `backgroundImageUrl` is optional — the owner's CardShare photo (a plain
 * http(s) URL — see 20260828000000_challenge_background_image.sql) — and is
 * desktop-only here: index.desktop.tsx passes it through, and `.hero`
 * (index.desktop.module.scss) reads the resulting `var(--ct-page-bg-image,
 * none)` anchored `right bottom` at a fixed size, so it reads as a
 * decorative accent behind the card column rather than fighting the
 * headline text on the left. `none` as the fallback means a challenge with
 * no photo renders exactly as before. Set via `style.setProperty`, a DOM
 * API that assigns a CSS custom property's *value*, not a string that gets
 * parsed as CSS/HTML — an owner-supplied URL here can't break out of the
 * `url(...)` it's wrapped in the way it could if this were template-string
 * HTML.
 *
 * Mobile doesn't use this mechanism: index.mobile.tsx calls this with just
 * `themeId` and instead renders `backgroundImageUrl` as a real `<img>`
 * below TaskSharedCard (`.heroImage`, index.mobile.module.scss) — a
 * single-column layout has no "corner" for a background accent to anchor
 * to, so it reads better as its own block in the flow than as a backdrop.
 *
 * `pageBackgroundImageUrl` is a *separate* photo (Challenge.pageBackgroundImageUrl, not
 * backgroundImageUrl) covering the whole page rather than a corner — used by both desktop and
 * mobile's own `.page` (`background: var(--ct-page-full-bg-image, var(--ct-page-bg)) center /
 * cover no-repeat`), replacing the theme's own background entirely when set, same "none means
 * unchanged" fallback as the corner image.
 */
export function useApplyChallengeTheme(
  themeId: ChallengeThemeId,
  backgroundImageUrl?: string | null,
  pageBackgroundImageUrl?: string | null,
) {
  React.useEffect(() => {
    const vars = CHALLENGE_PAGE_THEMES[themeId] ?? CHALLENGE_PAGE_THEMES.classic;
    const root = document.documentElement;
    const entries = Object.entries(vars) as [string, string][];
    entries.forEach(([key, value]) => root.style.setProperty(key, value));
    if (backgroundImageUrl) {
      root.style.setProperty('--ct-page-bg-image', `url("${backgroundImageUrl}")`);
    }
    if (pageBackgroundImageUrl) {
      root.style.setProperty('--ct-page-full-bg-image', `url("${pageBackgroundImageUrl}")`);
    }
    return () => {
      entries.forEach(([key]) => root.style.removeProperty(key));
      root.style.removeProperty('--ct-page-bg-image');
      root.style.removeProperty('--ct-page-full-bg-image');
    };
  }, [themeId, backgroundImageUrl, pageBackgroundImageUrl]);
}
