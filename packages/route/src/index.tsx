import React from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import SettingPage from '@dreamer/setting-page-ui';
import SettingPageDesktop from '@dreamer/setting-page-ui/src/index.desktop';
import LocalStorageEditor from './local-storage-editor';
import GameStarted from '@table-soccer/game-started';
import { AnimatePresence, motion } from 'motion/react';
import { useIsMobile } from '@dreamer/global';

const AnimationRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

const AppRouter = () => {
  const location = useLocation(); // Get the current location
  const isMobile = useIsMobile();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/setting"
          element={
            <AnimationRoute>
              {isMobile ? <SettingPage /> : <SettingPageDesktop />}
            </AnimationRoute>
          }
        />
        <Route
          path="/setting/local-storage-editor"
          element={
            <AnimationRoute>
              <LocalStorageEditor />
            </AnimationRoute>
          }
        />
        <Route
          path="/"
          element={
            <AnimationRoute>
              <GameStarted />
            </AnimationRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

// Wrap AppRouter with HashRouter in a parent component or directly if needed
const App = () => {
  return (
    <HashRouter>
      <AppRouter />
    </HashRouter>
  );
};

export default App;
