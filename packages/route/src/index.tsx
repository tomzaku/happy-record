import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from '@dreamer/header';
import SettingPage from '@dreamer/setting-page-ui';
import DetailTaskPage from '@dreamer/detail-task-page';
import FocusZonePage from '@dreamer/focus-zone-page-ui';
import PregnantIntro from '@pregnant/pregnant-intro';
import PregnantPage from '@pregnant/pregnant-page-ui';
import {
  EditChecklistForm,
  CreateChecklistForm,
} from '@pregnant/create-checklist-page-ui';
import PregnantWeightRecord from '@pregnant/pregnant-weight-record';
import ChecklistTemplatePageUi from '@pregnant/checklist-template-page-ui';
import StoryPageUi from '@pregnant/story-page-ui';
import Audio from '@pregnant/pregnant-audio-player';
import { AnimatePresence, motion } from 'motion/react';
import { NoteManagerPage } from '@happy-record/note-manager-page-ui';
import { AddNotePage } from '@happy-record/add-note-page-ui';

// Hocs
import RecordPage from '@dreamer/record-page-ui';
import LocalStorageEditor from './local-storage-editor';
import TasksSharedPage from '@happy-record/tasks-shared-page-ui';
import ChecklistTemplateSharedPageUi from '@happy-record/checklist-template-shared-page-ui';

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

  return (
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
              <DetailTaskPage />
            </AnimationRoute>
          }
        />
        <Route
          path="/task/:taskId/focus"
          element={
            <AnimationRoute>
              <FocusZonePage />
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
          path="/weight-record"
          element={
            <AnimationRoute>
              <PregnantWeightRecord />
            </AnimationRoute>
          }
        />
        <Route
          path="/intro"
          element={
            <AnimationRoute>
              <PregnantIntro />
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
              <SettingPage />
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
              <NoteManagerPage />
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
