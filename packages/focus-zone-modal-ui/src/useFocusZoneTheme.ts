import { useLocalStorage } from '@dreamer/global';
import { stopAllSounds, toggleSound } from '@dreamer/music-controller-common';
import { DEFAULT_FOCUS_ZONE_THEME, FocusZoneThemeId, getFocusZoneTheme } from './focusZoneThemes';

const FOCUS_ZONE_THEME_KEY = 'focus_zone_theme';
const FOCUS_ZONE_DARK_MODE_KEY = 'focus_zone_dark_mode';

/** Genuinely local-only, per-device display preference — same shape as theme/pomodoro config
 *  elsewhere in the app (see CLAUDE.md's "Genuinely local-only state... keeps using real
 *  useLocalStorage"), not something that needs a backend row. */
export const useFocusZoneTheme = () => {
  const [focusZoneTheme, setStoredTheme] = useLocalStorage<FocusZoneThemeId>(
    FOCUS_ZONE_THEME_KEY,
    DEFAULT_FOCUS_ZONE_THEME,
  );

  // Focus Zone's own dark/light mode for the `default` preset — deliberately its own local flag,
  // never `usePomodoroGlobalConfig`'s `theme`/`setTheme` (the real app-wide toggle). It used to
  // reuse that global one directly, which meant the header's sun/moon icon inside Focus Zone
  // silently repainted the *entire app* the moment the modal closed — reported broken. Read by
  // index.tsx as `data-theme` set directly on `.modalContainer` itself, which overrides whatever
  // `--focus-zone-*` values that element would otherwise inherit from the app's real theme
  // higher up the tree, without touching that ancestor or anything else outside this modal.
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>(FOCUS_ZONE_DARK_MODE_KEY, true);
  const toggleDarkMode = () => setIsDarkMode(current => !current);

  // Picking a theme is exclusive: whatever was already playing (the previous theme's own sounds,
  // or anything toggled on by hand) stops first, then this theme's own sounds start — a
  // reported-broken earlier version left the old theme's sounds running underneath the new one.
  const setFocusZoneTheme = (nextTheme: FocusZoneThemeId) => {
    setStoredTheme(nextTheme);
    stopAllSounds();
    getFocusZoneTheme(nextTheme).sounds?.forEach(sound => {
      toggleSound(sound, true, { loop: true });
    });
  };

  return { focusZoneTheme, setFocusZoneTheme, isDarkMode, toggleDarkMode };
};
