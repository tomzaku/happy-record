// Components
import AppRouter from '@dreamer/route';
import PwaInstallation from '@dreamer/pwa';
import FocusZoneModal from '@dreamer/focus-zone-modal-ui';

// Hooks
import {
  usePomodoroGlobalConfig,
  withPomodoroGlobalConfig,
} from '@dreamer/pomodoro-common';
import { useSession } from '@dreamer/global';

// Hoc
import { withTranslation } from '@dreamer/translation';
import React from 'react';

import './normalize.css';
import styles from './App.module.scss';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong.</h2>
          <p>Please refresh the page or try again later.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { theme } = usePomodoroGlobalConfig();
  // Anonymous sign-in so the device has a Supabase session to sync through —
  // no-op when no backend is configured (VITE_SUPABASE_URL unset).
  useSession();
  // Focus Zone Modal state
  const [isFocusZoneOpen, setIsFocusZoneOpen] = React.useState(false);
  return (
    <ErrorBoundary>
      <div className={styles.container} data-theme={theme}>
        <div className={styles.body}>
          <FocusZoneModal

            visible={isFocusZoneOpen}
            onDismiss={() => setIsFocusZoneOpen(false)}
            onOpenModal={() => setIsFocusZoneOpen(true)}
          />
          <AppRouter />
          <PwaInstallation />
        </div>
        <div id="drawer-global-root" />
        <div id="modal-global-root" />
      </div>
    </ErrorBoundary>
  );
}

export default withTranslation(withPomodoroGlobalConfig(App));
