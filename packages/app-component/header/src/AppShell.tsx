import React from 'react';
import { useIsMobile } from '@dreamer/global';
import AppHeader from './AppHeader';
import DesktopDrawer from './DesktopDrawer';
import styles from './AppShell.module.scss';

/**
 * The chrome a single-file page (no `index.desktop.tsx`/`index.mobile.tsx` split) wants: the
 * plain top `AppHeader` bar on mobile, the real left-nav `DesktopDrawer` sidebar on desktop —
 * the same split every split page (record-page-ui, detail-task-page, note-manager-page-ui, ...)
 * already gets by rendering `DesktopDrawer` in its own `index.desktop.tsx` and `AppHeader` in its
 * own `index.mobile.tsx`. A page whose desktop and mobile content is otherwise identical (nothing
 * differs but the nav chrome around it) doesn't need a full three-file split just for that —
 * `challenge-dashboard-page-ui`/`challenge-list-page-ui` use this instead of duplicating their own
 * (long) shared JSX across a dispatcher + two near-identical copies.
 */
const AppShell = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <>
        <AppHeader />
        {children}
      </>
    );
  }

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>{children}</div>
    </div>
  );
};

export default AppShell;
