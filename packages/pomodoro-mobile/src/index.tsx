import React from 'react';
import Drawer from '@moon-ui/drawer';
import ShortBreak from './component/ShortBreak';
import LongBreak from './component/LongBreak';
import Typography from '@moon-ui/typography';
import Pomodoro from './component/Pomodoro';
import Header from './component/Header';
import IconMusic from '@moon-ui/icon/IconMusic';
import WarningModal from '@moon-ui/modal/src/WarningModal';

import cx from 'classnames';

// Hooks
import { useIntl } from '@dreamer/translation';
import { useGlobalTool } from '@dreamer/global-tool-common';
import { useWakeLockPwa } from '@dreamer/global';

import styles from './index.module.scss';

// Enum
import { GlobalTool } from '@dreamer/global-tool-common';
import { PomodoroPhase } from '@dreamer/pomodoro-common';

// Utils
import { loadSounds } from '@dreamer/notification';
import { usePomodoroTimer } from '@dreamer/pomodoro-common';

enum State {
  Pomodoro,
}

export default function PomodoroMobile({
  visible,
  onClickBackButton,
}: {
  visible: boolean;
  onClickBackButton?: () => void;
}) {
  const intl = useIntl();
  const [modalVisible, setModalVisible] = React.useState(false);
  const {
    pomodoroPhase,
    setPomodoroPhase,
    autoStartTimerWhenChangePomodoroPhase,
  } = usePomodoroTimer();
  const [modalInfo, setModalInfo] = React.useState<PomodoroPhase>(
    PomodoroPhase.Pomodoro
  );
  const { open } = useGlobalTool();
  useWakeLockPwa();

  React.useEffect(() => {
    loadSounds();
  }, []);

  const renderBody = () => {
    return (
      <>
        <WarningModal
          title={intl.formatMessage({
            defaultMessage: 'STOP PROGRESS?',
            id: 'music-controller-mobile.label-stop-progress',
          })}
          primaryButtonText={intl.formatMessage({
            defaultMessage: 'NO',
            id: 'label-no',
          })}
          primaryButtonOnClick={() => {
            setModalVisible(false);
          }}
          secondaryButtonText={intl.formatMessage({
            defaultMessage: 'YES',
            id: 'label-yes',
          })}
          secondaryButtonClick={() => {
            setModalVisible(false);
            setPomodoroPhase(modalInfo);
            autoStartTimerWhenChangePomodoroPhase(modalInfo);
          }}
          visible={modalVisible}
          content={
            <>
              {intl.formatMessage(
                {
                  id: 'music-controller-mobile.label-modal-confirm',
                  defaultMessage:
                    'Press Yes if you want to switch mode to {{mode}}',
                },
                {
                  mode: (() => {
                    switch (modalInfo) {
                      case PomodoroPhase.Pomodoro:
                        return 'Pomodoro';
                      case PomodoroPhase.ShortBreak:
                        return 'Short Break';
                      case PomodoroPhase.LongBreak:
                        return 'Long Break';
                    }
                  })(),
                }
              )}
            </>
          }
        />
        <Header onClickBackButton={onClickBackButton}>
          <div className={styles.tabContainer}>
            <div className={styles.tab}>
              <Typography.Text
                className={cx(
                  styles.tabName,
                  pomodoroPhase === PomodoroPhase.Pomodoro &&
                    styles.tabNameActive
                )}
                onClick={() => {
                  if (pomodoroPhase !== PomodoroPhase.Pomodoro) {
                    setModalVisible(true);
                    setModalInfo(PomodoroPhase.Pomodoro);
                  }
                }}
              >
                {intl.formatMessage({
                  id: 'music-controller-mobile.label-pomodoro-tab',
                  defaultMessage: 'Pomodoro',
                })}
              </Typography.Text>
              <Typography.Text
                className={cx(
                  styles.tabName,
                  pomodoroPhase === PomodoroPhase.ShortBreak &&
                    styles.tabNameActive
                )}
                onClick={() => {
                  if (pomodoroPhase !== PomodoroPhase.ShortBreak) {
                    setModalVisible(true);
                    setModalInfo(PomodoroPhase.ShortBreak);
                  }
                }}
              >
                {intl.formatMessage({
                  id: 'music-controller-mobile.label-pomodoro-short-break',
                  defaultMessage: 'Short Break',
                })}
              </Typography.Text>
              <Typography.Text
                className={cx(
                  styles.tabName,
                  pomodoroPhase === PomodoroPhase.LongBreak &&
                    styles.tabNameActive
                )}
                onClick={() => {
                  if (pomodoroPhase !== PomodoroPhase.LongBreak) {
                    setModalVisible(true);
                    setModalInfo(PomodoroPhase.LongBreak);
                  }
                }}
              >
                {intl.formatMessage({
                  id: 'music-controller-mobile.label-pomodoro-long-break',
                  defaultMessage: 'Long Break',
                })}
              </Typography.Text>
            </div>
            <div className={styles.app}>
              <IconMusic onClick={() => open(GlobalTool.Sound)} />
            </div>
          </div>
        </Header>
        {(() => {
          switch (pomodoroPhase) {
            case PomodoroPhase.Pomodoro: {
              return <Pomodoro />;
            }
            case PomodoroPhase.ShortBreak: {
              return <ShortBreak />;
            }
            case PomodoroPhase.LongBreak:
            default: {
              return <LongBreak />;
            }
          }
        })()}
      </>
    );
  };
  return (
    <Drawer className={styles.drawer} visible={visible}>
      {renderBody()}
    </Drawer>
  );
}
