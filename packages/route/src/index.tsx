import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@dreamer/header';
import SettingPage from '@dreamer/setting-page-ui';
import PregnantIntro from '@pregnant/pregnant-intro';
import PregnantPage from '@pregnant/pregnant-page-ui';
import PregnantCreateChecklistPage from '@pregnant/create-checklist-page-ui';
import PregnantWeightRecord from '@pregnant/pregnant-weight-record';
import ChecklistTemplatePageUi from '@pregnant/checklist-template-page-ui';
import StoryPageUi from '@pregnant/story-page-ui'

// Hocs
import { useLocalStorage } from '@dreamer/global';
import BabyPageUi from '@pregnant/baby-page-ui';

const AppRouter = () => {
  const [isNew, setIsNew] = useLocalStorage('user_new', true);
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        {isNew ? (
          <Route path="*" element={<PregnantIntro />}></Route>
        ) : (
          <>
            <Route path="/" element={<PregnantPage />}></Route>,
            <Route
              path="/create-checklist"
              element={<PregnantCreateChecklistPage />}
            ></Route>
            <Route
              path="/weight-record"
              element={<PregnantWeightRecord />}
            ></Route>
            <Route path="/intro" element={<PregnantIntro />}></Route>,
            <Route
              path="/checklist-template"
              element={<ChecklistTemplatePageUi />}
            ></Route>
            <Route path="/setting" element={<SettingPage />}></Route>
            <Route path="/baby" element={<BabyPageUi />}></Route>
            <Route path="/story" element={<StoryPageUi />}></Route>
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
