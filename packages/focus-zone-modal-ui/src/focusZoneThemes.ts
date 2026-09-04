import { TypeSound } from '@dreamer/music-controller-common';

// The Focus Zone's own theme, on top of (not replacing) the app-wide dark/light toggle —
// `'default'` is exactly today's look (that gradient background, untouched, per the explicit
// "currently we have dark and white, please keep it" requirement): no backgroundImage, no
// sounds. Every other theme swaps the modal's background for a real photo and turns on a
// matching set of ambient sounds (see useFocusZoneTheme's own setFocusZoneTheme) — exclusive:
// picking a theme stops whatever was already playing (the previous theme's own sounds, or
// anything toggled on by hand) before starting this one's, so switching presets never leaves the
// old one's sounds running underneath the new one.

export type FocusZoneThemeId = 'default' | 'coffeeshop' | 'forest';

export type FocusZoneThemeOption = {
  id: FocusZoneThemeId;
  label: string;
  /** Absent for 'default' — see this file's own top comment. */
  backgroundImage?: string;
  sounds?: TypeSound[];
};

export const FOCUS_ZONE_THEMES: FocusZoneThemeOption[] = [
  {
    id: 'default',
    label: 'Default',
  },
  {
    id: 'coffeeshop',
    label: 'Coffee Shop',
    // Pexels, free to use — "Cozy Coffee Shop with Modern Interior Design" by Ayşe Demir
    // (pexels.com/photo/35134952) — warm neutral tones and soft lighting read better as a
    // full-screen backdrop than the previous night/bokeh shot did.
    backgroundImage:
      'https://images.pexels.com/photos/35134952/pexels-photo-35134952.jpeg?auto=compress&cs=tinysrgb&w=1920',
    sounds: [TypeSound.InterviewInACafe, TypeSound.LofiHiphop],
  },
  {
    id: 'forest',
    label: 'Forest',
    // Pexels, free to use — photo by Snapwire (pexels.com/photo/6858).
    backgroundImage:
      'https://images.pexels.com/photos/6858/landscape-nature-forest-trees.jpg?auto=compress&cs=tinysrgb&w=1920',
    sounds: [TypeSound.Bird, TypeSound.Cricket, TypeSound.StreamRiver],
  },
];

export const DEFAULT_FOCUS_ZONE_THEME: FocusZoneThemeId = 'default';

export const getFocusZoneTheme = (id: FocusZoneThemeId): FocusZoneThemeOption =>
  FOCUS_ZONE_THEMES.find(theme => theme.id === id) ?? FOCUS_ZONE_THEMES[0];
