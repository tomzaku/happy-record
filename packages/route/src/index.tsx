import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '@dreamer/header';
import SettingPage from '@dreamer/setting-page-ui';
import MusicControllerMobile from '@dreamer/music-controller-mobile';
import PomodoroMobile from '@dreamer/pomodoro-mobile';
import PregnantIntro from '@pregnant/pregnant-intro';
import PregnantPage from '@pregnant/pregnant-page-ui';
import PregnantCreateChecklistPage from '@pregnant/create-checklist-page-ui';
import PregnantWeightRecord from '@pregnant/pregnant-weight-record';

// Hooks
import { useGlobalTool, GlobalTool } from '@dreamer/global-tool-common';

// Hocs
import { withGlobalTool } from '@dreamer/global-tool-common';
import { useTask, withTask } from '@dreamer/tasks-page-common';
import { withPomodoroTimer } from '@dreamer/pomodoro-common';

const AppRouter = () => {
  const { isToolVisible, close } = useGlobalTool();
  const { cancelProcessingTask, createTaskFromWeeklyHobby } = useTask();
  React.useEffect(() => {
    cancelProcessingTask();
    createTaskFromWeeklyHobby();
  }, []);
  return (
    <BrowserRouter>
      <Header />
      <MusicControllerMobile
        onClickBackButton={close}
        visible={isToolVisible(GlobalTool.Sound)}
      />
      <PomodoroMobile
        onClickBackButton={close}
        visible={isToolVisible(GlobalTool.FocusMode)}
      />
      <Routes>
        <Route path="/" element={<PregnantPage />}></Route>,
        <Route
          path="/create-checklist"
          element={<PregnantCreateChecklistPage />}
        ></Route>
        <Route path="/weight-record" element={<PregnantWeightRecord />}></Route>
        <Route path="/intro" element={<PregnantIntro />}></Route>,
        <Route path="/setting" element={<SettingPage />}></Route>
      </Routes>
    </BrowserRouter>
  );
};

export default withPomodoroTimer(withTask(withGlobalTool(AppRouter)));
