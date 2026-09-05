// Component
import IconTranslate from '@moon-ui/icon/IconTranslate';
import List from '@moon-ui/list/src';
import Radio from '@moon-ui/radio';
import Input from '@moon-ui/input';
import IconTimer from '@moon-ui/icon/IconTimer';
import Typography from '@moon-ui/typography';
import IconTheme from '@moon-ui/icon/IconTheme';
import Button from '@moon-ui/button';

// Enum
import { Language, useCurrentAccount } from '@dreamer/global';
import { Theme } from '@dreamer/pomodoro-common';

// Hooks
import { useIntl } from '@dreamer/translation';
import { usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import { useNavigate } from 'react-router-dom';

import styles from './index.module.scss';
import { BackHeader } from '@dreamer/header';
import Icon from '@moon-ui/icon/Icon';

const version = '1.0.2';

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
  const { isAnonymous, email, hasBackend, signInWithGoogle, signOut, isPro, isTrial, proExpiresAt } =
    useCurrentAccount();
  const handleGoogleSignIn = async () => {
    const error = await signInWithGoogle();
    if (error) console.warn('[dreamer] Google sign-in failed:', error);
  };
  const handleSignOut = async () => {
    const error = await signOut();
    if (error) console.warn('[dreamer] Sign out failed:', error);
  };
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
        {hasBackend && (
          <List.ItemMeta
            logo={<Icon width={24} icon="flat-color-icons:google" />}
            title={isAnonymous ? 'Sign in with Google' : email || 'Signed in'}
            description={
              isAnonymous
                ? 'Back up your data and use it on another device'
                : 'Synced to your Google account'
            }
            rightComponent={
              isAnonymous ? (
                <Button size="sm" onClick={handleGoogleSignIn}>
                  Sign In
                </Button>
              ) : (
                <Button size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              )
            }
          />
        )}
        {hasBackend && (
          <List.ItemMeta
            logo={<Icon width={24} icon="mdi:crown" />}
            title={isTrial ? 'Pro trial' : isPro ? 'Pro' : 'Free plan'}
            description={
              isTrial && proExpiresAt
                ? `Ends ${new Date(proExpiresAt).toLocaleDateString()}`
                : isPro
                  ? 'You have full access'
                  : 'No self-serve upgrade yet'
            }
          />
        )}
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
      <div className={styles.footer}>
        <Typography.Text
          className={styles.version}
          onClick={() => navigate('/setting/local-storage-editor')}
        >
          Version: {version}
        </Typography.Text>
        <a href="https://github.com/tomzaku/dreamer-web-public/issues">
          <Typography.Text className={styles.link}>
            | Feature Request | Bug Report
          </Typography.Text>
        </a>
      </div>
    </div>
  );
}
