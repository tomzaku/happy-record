import React from 'react';
import { DesktopDrawer } from '@dreamer/header';
import List from '@moon-ui/list/src';
import Radio from '@moon-ui/radio';
import IconTimer from '@moon-ui/icon/IconTimer';
import IconTranslate from '@moon-ui/icon/IconTranslate';
import Typography from '@moon-ui/typography';
import IconTheme from '@moon-ui/icon/IconTheme';
import Icon from '@moon-ui/icon/Icon';
import Button from '@moon-ui/button';

// Enum
import { Language, useSession } from '@dreamer/global';
import { Theme } from '@dreamer/pomodoro-common';

// Hooks
import { useIntl } from '@dreamer/translation';
import { usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import { useNavigate } from 'react-router-dom';

import styles from './index.desktop.module.scss';

const version = '1.0.2';

const ONE_MINUTE = 60 * 1000;

export default function SettingPageDesktop() {
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
  const { isAnonymous, email, hasBackend, signInWithGoogle, signOut } = useSession();
  const handleGoogleSignIn = async () => {
    const error = await signInWithGoogle();
    if (error) console.warn('[dreamer] Google sign-in failed:', error);
  };
  const handleSignOut = async () => {
    const error = await signOut();
    if (error) console.warn('[dreamer] Sign out failed:', error);
  };

  return (
    <div className={styles.desktopContainer}>
      <DesktopDrawer />
      <div className={styles.desktopBody}>
        <div className={styles.centerContent}>
          <div className={styles.pageHeader}>
            <Typography.Title level={2}>
              {formatMessage({
                id: 'setting-page.title',
                defaultMessage: 'Settings',
              })}
            </Typography.Title>
          </div>
          
          <div className={styles.settingsContainer}>
            {hasBackend && (
              <div className={styles.settingsSection}>
                <Typography.Title level={4} className={styles.sectionTitle}>
                  Account
                </Typography.Title>
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
              </div>
            )}
            <div className={styles.settingsSection}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Appearance
              </Typography.Title>
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
            </div>

            <div className={styles.settingsSection}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Task Management
              </Typography.Title>
              <List.ItemMeta
                onClick={() => navigate('/checklist-template')}
                logo={<Icon width={24} icon="proicons:task-list" />}
                title={'Task Management'}
                description={'Select/ Deselect Tasks'}
              />
            </div>

            <div className={styles.settingsSection}>
              <Typography.Title level={4} className={styles.sectionTitle}>
                Pomodoro Timer
              </Typography.Title>
              <List.ItemMeta
                logo={<IconTimer />}
                title={'Pomodoro Duration'}
                description={'Set the duration for each pomodoro session'}
                rightComponent={
                  <input
                    type="number"
                    value={pomodoro / ONE_MINUTE}
                    onChange={e => setPomodoro(Number(e.target.value) * ONE_MINUTE)}
                    min={1}
                    max={60}
                    className={styles.numberInput}
                  />
                }
              />
              <List.ItemMeta
                logo={<IconTimer />}
                title={'Short Break Duration'}
                description={'Set the duration for short breaks'}
                rightComponent={
                  <input
                    type="number"
                    value={shortBreak / ONE_MINUTE}
                    onChange={e => setShortBreak(Number(e.target.value) * ONE_MINUTE)}
                    min={1}
                    max={30}
                    className={styles.numberInput}
                  />
                }
              />
              <List.ItemMeta
                logo={<IconTimer />}
                title={'Long Break Duration'}
                description={'Set the duration for long breaks'}
                rightComponent={
                  <input
                    type="number"
                    value={longBreak / ONE_MINUTE}
                    onChange={e => setLongBreak(Number(e.target.value) * ONE_MINUTE)}
                    min={1}
                    max={60}
                    className={styles.numberInput}
                  />
                }
              />
            </div>
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
      </div>
    </div>
  );
}
