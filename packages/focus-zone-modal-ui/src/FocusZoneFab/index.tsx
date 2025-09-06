import { useIsMobile } from '@dreamer/global';

import { default as FocusZoneFabMobile } from './FocusZoneFab.mobile';
import { default as FocusZoneFabDesktop } from './FocusZoneFab.desktop';

interface FocusZoneFabProps {
  timerMode: 'stopwatch' | 'pomodoro';
  stopwatchTime: number;
  pomodoroTime: number;
  isStopwatchRunning: boolean;
  isPomodoroRunning: boolean;
  onToggleStopwatch: () => void;
  onTogglePomodoro: () => void;
  onResetStopwatch: () => void;
  onResetPomodoro: () => void;
  onOpenModal: () => void;
  onOpenMusicPlayer: () => void;
}

const FocusZoneFab = (props: FocusZoneFabProps) => {
    const isMobile = useIsMobile()
    if(isMobile) {
        return <FocusZoneFabMobile {...props} />
    }
    return  <FocusZoneFabDesktop {...props} />
}

export default FocusZoneFab;