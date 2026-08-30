import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@dreamer/header';
import SettingPage from '@dreamer/setting-page-ui';
import SettingPageDesktop from '@dreamer/setting-page-ui/src/index.desktop';
import DetailTaskPage from '@dreamer/detail-task-page';
import DetailTaskPageDesktop from '@dreamer/detail-task-page/src/index.desktop';

import {
  EditChecklistForm,
  CreateChecklistForm,
} from '@pregnant/create-checklist-page-ui';
import ChecklistTemplatePageUi from '@pregnant/checklist-template-page-ui';
import StoryPageUi from '@pregnant/story-page-ui';
import Audio from '@pregnant/pregnant-audio-player';
import { AnimatePresence, motion } from 'motion/react';
import { NoteManagerPage } from '@happy-record/note-manager-page-ui';
import { NoteManagerPageDesktop } from '@happy-record/note-manager-page-ui/src/index.desktop';
import { AddNotePage } from '@happy-record/add-note-page-ui';

// Hocs
import RecordPage from '@dreamer/record-page-ui';
import LocalStorageEditor from './local-storage-editor';
import TasksSharedPage from '@happy-record/tasks-shared-page-ui';
import ChecklistTemplateSharedPageUi from '@happy-record/checklist-template-shared-page-ui';
import ChallengeDashboardPageUi from '@happy-record/challenge-dashboard-page-ui';
import ChallengeListPageUi from '@happy-record/challenge-list-page-ui';
import FocusZoneModal from '@dreamer/focus-zone-modal-ui';
import { useIsMobile, useResumePendingChallengeJoin } from '@dreamer/global';

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
  // Resumes a "Take it" click on a challenge that had to detour through
  // Google sign-in first — see useResumePendingChallengeJoin.tsx. Mounted
  // once here (inside the Router, since it navigates on success) rather
  // than on the shared-challenge page itself, because the Google redirect
  // always lands back on "/", not on that page.
  useResumePendingChallengeJoin();

  // Focus Zone Modal state — rendered here rather than in web/src/App.tsx
  // so it can read the current route (App.tsx sits outside the Router) and
  // hide its FAB on the shared-challenge landing page.
  const [isFocusZoneOpen, setIsFocusZoneOpen] = React.useState(false);
  const isSharedChallengePage = location.pathname.startsWith('/checklist-template/shared');

  return (
    <>
      <FocusZoneModal
        visible={isFocusZoneOpen}
        onDismiss={() => setIsFocusZoneOpen(false)}
        onOpenModal={() => setIsFocusZoneOpen(true)}
        hideFab={isSharedChallengePage}
      />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <AnimationRoute>
                <RecordPage />
              </AnimationRoute>
            }
          />
          <Route
            path="/task/:id"
            element={
              <AnimationRoute>
                {isMobile ? <DetailTaskPage /> : <DetailTaskPageDesktop />}
              </AnimationRoute>
            }
          />

          <Route
            path="/task/:id/share"
            element={
              <AnimationRoute>
                <TasksSharedPage />
              </AnimationRoute>
            }
          />
          <Route
            path="/checklist-template/shared"
            element={
              <AnimationRoute>
                <ChecklistTemplateSharedPageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/checklist-template/shared/:id"
            element={
              <AnimationRoute>
                <ChecklistTemplateSharedPageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/challenge/:id"
            element={
              <AnimationRoute>
                <ChallengeDashboardPageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/challenges"
            element={
              <AnimationRoute>
                <ChallengeListPageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/create-checklist"
            element={
              <AnimationRoute>
                <CreateChecklistForm />
              </AnimationRoute>
            }
          />
          <Route
            path="/edit-checklist/:id"
            element={
              <AnimationRoute>
                <EditChecklistForm />
              </AnimationRoute>
            }
          />
          <Route
            path="/checklist-template"
            element={
              <AnimationRoute>
                <ChecklistTemplatePageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/setting"
            element={
              <AnimationRoute>
                {isMobile ? <SettingPage /> : <SettingPageDesktop />}
              </AnimationRoute>
            }
          />
          <Route
            path="/story"
            element={
              <AnimationRoute>
                <StoryPageUi />
              </AnimationRoute>
            }
          />
          <Route
            path="/audio"
            element={
              <AnimationRoute>
                <Audio />
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
            path="/notes"
            element={
              <AnimationRoute>
                {isMobile ? <NoteManagerPage /> : <NoteManagerPageDesktop />}
              </AnimationRoute>
            }
          />
          <Route
            path="/notes/add"
            element={
              <AnimationRoute>
                <AddNotePage />
              </AnimationRoute>
            }
          />
        </Routes>
      </AnimatePresence>
    </>
  );
};

// GitHub Pages serves the build under /happy-record/ (vite.config.mjs's
// `base`) but local dev serves under '/' — `basename` has to track the same
// split so a route like `/task/:id` resolves under both. `BASE_URL` always
// has a trailing slash; `basename` must not, or react-router double-slashes
// generated links (`//task/:id`). Same pattern as voca's App.tsx.
const App = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'}>
      <AppRouter />
    </BrowserRouter>
  );
};

export default App;
