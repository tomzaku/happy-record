import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@dreamer/header';
import SettingPage from '@dreamer/setting-page-ui';
import DetailTaskPage from '@dreamer/detail-task-page';
import PregnantIntro from '@pregnant/pregnant-intro';
import PregnantPage from '@pregnant/pregnant-page-ui';
import PregnantCreateChecklistPage from '@pregnant/create-checklist-page-ui';
import PregnantEditChecklistPage from '@pregnant/create-checklist-page-ui/src/EditChecklistPage';
import PregnantWeightRecord from '@pregnant/pregnant-weight-record';
import ChecklistTemplatePageUi from '@pregnant/checklist-template-page-ui';
import StoryPageUi from '@pregnant/story-page-ui';
import Audio from '@pregnant/pregnant-audio-player';

// Hocs
import RecordPage from '@dreamer/record-page-ui';

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<RecordPage />}></Route>,
        <Route path="/task/:id" element={<DetailTaskPage />}></Route>
        <Route
          path="/create-checklist"
          element={<PregnantCreateChecklistPage />}
        ></Route>
        <Route
          path="/edit-checklist/:id"
          element={<PregnantEditChecklistPage />}
        ></Route>
        <Route path="/weight-record" element={<PregnantWeightRecord />}></Route>
        <Route path="/intro" element={<PregnantIntro />}></Route>,
        <Route
          path="/checklist-template"
          element={<ChecklistTemplatePageUi />}
        ></Route>
        <Route path="/setting" element={<SettingPage />}></Route>
        <Route path="/story" element={<StoryPageUi />}></Route>
        <Route path="/audio" element={<Audio />}></Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
