import React from 'react';
import styles from './MoonProvider.module.scss';

type Props = {
  /** Plain string, not this app's own `Theme` enum (`@dreamer/pomodoro-common`) — this package is
   * a generic UI kit and shouldn't depend on an app-domain package just for a type; any string a
   * `[data-theme='...']` selector in app-scss/theme/*.scss matches works (today: 'light'/'dark'). */
  theme: string;
  children: React.ReactNode;
};

/**
 * Wraps the whole app in the one `[data-theme]` scope every themed CSS variable in this design
 * system is written against (`--card-background` and the rest — see app-scss/theme/light.scss's
 * own comment: there's no unscoped `:root` fallback, so anything outside this scope renders with
 * none of them defined), and renders `moon-ui-portal-root` — the one shared target every
 * portal-based moon-ui component (Modal, Drawer, Select's own dropdown, ...) escapes into (see
 * `getMoonPortalRoot` in `./portalRoot`) instead of each hand-wiring its own differently-named
 * div here.
 */
const MoonProvider = ({ theme, children }: Props) => (
  <div className={styles.container} data-theme={theme}>
    <div className={styles.body}>{children}</div>
    <div id="moon-ui-portal-root" />
  </div>
);

export default MoonProvider;
