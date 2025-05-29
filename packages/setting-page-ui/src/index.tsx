// Component
import IconTranslate from '@moon-ui/icon/IconTranslate';
import List from '@moon-ui/list/src';
import Radio from '@moon-ui/radio';
import Input from '@moon-ui/input';
import IconTimer from '@moon-ui/icon/IconTimer';
import Typography from '@moon-ui/typography';
import IconTheme from '@moon-ui/icon/IconTheme';

// Enum
import { Language } from '@dreamer/global';
import { Theme } from '@dreamer/pomodoro-common';

// Hooks
import { useIntl } from '@dreamer/translation';
import { usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import { useNavigate } from 'react-router-dom';

import styles from './index.module.scss';
import { BackHeader } from '@dreamer/header';
import Icon from '@moon-ui/icon/Icon';

const version = '1.0.1';

const ONE_MINUTE = 60 * 1000;

export default function SettingPage() {
  const {
    shortBreak,
    setShortBreak,
    pomodoro,
    setPomodoro,
    longBreak,
    setLongBreak,
    theme,
    setTheme,
  } = usePomodoroGlobalConfig();
  const navigate = useNavigate();
  const { language, changeLanguage, formatMessage } = useIntl();
  return (
    <div className={styles.container}>
      <BackHeader
        renderLeftComponent={() => (
          <>
            {formatMessage({
              id: 'setting-page.title',
              defaultMessage: 'Setting',
            })}
          </>
        )}
      />
      <div className={styles.body}>
        <List.ItemMeta
          logo={<IconTheme />}
          title={formatMessage({
            id: 'setting-page.label-theme',
            defaultMessage: 'Theme',
          })}
          description={formatMessage({
            id: 'setting-page.description-theme',
            defaultMessage: 'Config theme for whole page',
          })}
          rightComponent={
            <Radio
              isButton
              value={theme}
              onChangeValue={(theme: Theme) => setTheme(theme)}
              options={[
                {
                  label: formatMessage({
                    id: 'setting-page.label-light',
                    defaultMessage: 'Light',
                  }),
                  value: Theme.Light,
                },
                {
                  label: formatMessage({
                    id: 'setting-page.label-dark',
                    defaultMessage: 'Dark',
                  }),
                  value: Theme.Dark,
                },
              ]}
            />
          }
        />
        <List.ItemMeta
          logo={<IconTranslate />}
          title={'Language'}
          description={'Config language for whole page'}
          rightComponent={
            <Radio
              isButton
              value={language}
              onChangeValue={(language: Language) => changeLanguage(language)}
              options={[
                { label: 'VN', value: Language.Vi },
                { label: 'EN', value: Language.En },
              ]}
            />
          }
        />
        <List.ItemMeta
          onClick={() => navigate('/checklist-template')}
          logo={<Icon width={24} icon="proicons:task-list" />}
          title={'Task Management'}
          description={'Select/ Deselect Tasks'}
        />
      </div>
      <a
        href="https://github.com/tomzaku/dreamer-web-public/issues"
        className={styles.footer}
      >
        <Typography.Text className={styles.version}>
          Version: {version}
        </Typography.Text>
        <Typography.Text className={styles.link}>
          | Feature Request | Bug Report
        </Typography.Text>
      </a>
    </div>
  );
}
