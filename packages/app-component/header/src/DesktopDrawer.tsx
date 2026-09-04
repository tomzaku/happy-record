import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import IconSunny from '@moon-ui/icon/IconSunny';
import IconMoon from '@moon-ui/icon/IconMoon';
import { usePomodoroGlobalConfig } from '@dreamer/pomodoro-common';
import { Theme } from '@dreamer/pomodoro-common';
import cx from 'classnames';
import AccountStatus from './AccountStatus';
import TaskSearch from './TaskSearch';
import styles from './DesktopDrawer.module.scss';

const DesktopDrawer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMinimized, setIsMinimized] = React.useState(true);
  const { theme, setTheme } = usePomodoroGlobalConfig();

  const navigationItems = [
    {
      id: 'task',
      label: 'Tasks',
      icon: 'material-symbols:checklist',
      description: 'Manage your daily tasks',
      path: '/',
      action: () => navigate('/')
    },
    {
      id: 'note',
      label: 'Notes',
      icon: 'solar:notes-line-duotone',
      description: 'View and create notes',
      path: '/notes',
      action: () => navigate('/notes')
    },
    {
      id: 'challenges',
      label: 'Challenges',
      icon: 'solar:cup-star-line-duotone',
      description: 'See what you\'ve joined and your progress',
      path: '/challenges',
      action: () => navigate('/challenges')
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'solar:chart-square-line-duotone',
      description: 'How much you finish each week',
      path: '/dashboard',
      action: () => navigate('/dashboard')
    },
    // Settings is reachable via the account row in the drawer footer (AccountStatus
    // navigates there once signed in), so no separate settings nav item here.
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      // For the root path, check if it's exactly '/' or matches the task pattern '/task/<id>'
      return location.pathname === '/' || location.pathname.match(/^\/task\/[^/]+$/);
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigationClick = (itemId: string) => {
    const item = navigationItems.find(nav => nav.id === itemId);
    if (item) {
      item.action();
    }
  };

  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleToggleTheme = () => {
    setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light);
  };

  return (
    <div className={cx(styles.leftDrawer, isMinimized && styles.minimized)}>
      <div className={styles.drawerHeader}>
        <div className={styles.appBrand}>
          <button
            className={styles.toggleButton}
            onClick={handleToggleMinimize}
            aria-label={isMinimized ? 'Expand drawer' : 'Minimize drawer'}
          >
            <Icon
              icon="solar:hamburger-menu-line-duotone"
              width={20}
              className={styles.toggleIcon}
            />
          </button>
          {!isMinimized && (
            <Typography.Title level={3} className={styles.appTitle}>
              Dreamer
            </Typography.Title>
          )}
        </div>
        <button
          className={styles.themeToggleButton}
          onClick={handleToggleTheme}
          aria-label={`Switch to ${theme === Theme.Light ? 'dark' : 'light'} theme`}
        >
          {theme === Theme.Light ? (
            <IconMoon className={styles.themeIcon} />
          ) : (
            <IconSunny className={styles.themeIcon} />
          )}
        </button>
      </div>
      <nav className={styles.navigationMenu}>
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={cx(
              styles.navigationItem,
              isActivePath(item.path) && styles.activeNavigationItem,
              isMinimized && styles.minimizedNavigationItem
            )}
            onClick={() => handleNavigationClick(item.id)}
            title={isMinimized ? item.label : undefined}
            aria-label={item.label}
          >
            <div className={cx(
              styles.navigationIcon,
              isActivePath(item.path) && styles.activeNavigationIcon
            )}>
              <Icon className={isActivePath(item.path) ? styles.activeNavigationIcon : ''} icon={item.icon} width={isMinimized ? 24 : 20} />
            </div>
            {!isMinimized && (
              <div className={styles.navigationContent}>
                <Typography.Text className={styles.navigationLabel}>
                  {item.label}
                </Typography.Text>
                <Typography.Text className={styles.navigationDescription}>
                  {item.description}
                </Typography.Text>
              </div>
            )}
          </button>
        ))}
      </nav>
      <div className={styles.drawerFooter}>
        <TaskSearch variant="drawer" collapsed={isMinimized} />
        <AccountStatus variant="drawer" collapsed={isMinimized} />
      </div>
    </div>
  );
};

export default DesktopDrawer;
