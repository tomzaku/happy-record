// Components
import AppRouter from '@dreamer/route';
import PwaInstallation from '@dreamer/pwa';

// Hooks
import {
  usePomodoroGlobalConfig,
  withPomodoroGlobalConfig,
} from '@dreamer/pomodoro-common';

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
  return (
    <ErrorBoundary>
      <div className={styles.container} data-theme={theme}>
        <div className={styles.body}>
          <AppRouter />
          <PwaInstallation />
        </div>
        <div id="drawer-global-root" />
      </div>
    </ErrorBoundary>
  );
}

export default withTranslation(withPomodoroGlobalConfig(App));
