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

import './normalize.css';
import styles from './App.module.scss';

function App() {
  const { theme } = usePomodoroGlobalConfig();
  return (
    <div className={styles.container} data-theme={theme}>
      <div className={styles.body}>
        <AppRouter />
        <PwaInstallation />
      </div>
      <div id="drawer-global-root" />
    </div>
  );
}

export default withTranslation(withPomodoroGlobalConfig(App));
