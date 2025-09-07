import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import cx from 'classnames';
import styles from './DesktopDrawer.module.scss';

const DesktopDrawer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMinimized, setIsMinimized] = React.useState(true);

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
      id: 'setting',
      label: 'Settings',
      icon: 'solar:settings-linear',
      description: 'Configure your preferences',
      path: '/setting',
      action: () => navigate('/setting')
    }
  ];

  const isActivePath = (path: string) => {
    if (path === '/') {
      // For the root path, check if it's exactly '/' or matches the task pattern '/task/<id>'
      return location.pathname === '/' || location.pathname.match(/^\/task\/[^\/]+$/);
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
          >
            <div className={cx(
              styles.navigationIcon,
              isActivePath(item.path) && styles.activeNavigationIcon
            )}>
              <Icon className={isActivePath(item.path) ? styles.activeNavigationIcon : ''} icon={item.icon} width={20} />
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
            {isMinimized && (
              <Typography.Text className={styles.minimizedLabel}>
                {item.label}
              </Typography.Text>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DesktopDrawer;
