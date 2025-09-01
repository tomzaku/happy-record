import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import Icon from '@moon-ui/icon/Icon';
import cx from 'classnames';
import styles from './DesktopDrawer.module.scss';

const DesktopDrawer = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigationClick = (itemId: string) => {
    const item = navigationItems.find(nav => nav.id === itemId);
    if (item) {
      item.action();
    }
  };

  return (
    <div className={styles.leftDrawer}>
      <div className={styles.drawerHeader}>
        <div className={styles.appBrand}>
          <Typography.Title level={3} className={styles.appTitle}>
            Dreamer
          </Typography.Title>
        </div>
      </div>
      <nav className={styles.navigationMenu}>
        {navigationItems.map((item) => (
          <button
            key={item.id}
            className={cx(
              styles.navigationItem,
              isActivePath(item.path) && styles.activeNavigationItem
            )}
            onClick={() => handleNavigationClick(item.id)}
          >
            <div className={cx(
              styles.navigationIcon,
              isActivePath(item.path) && styles.activeNavigationIcon
            )}>
              <Icon className={isActivePath(item.path) ? styles.activeNavigationIcon:''} icon={item.icon} width={20} />
            </div>
            <div className={styles.navigationContent}>
              <Typography.Text className={styles.navigationLabel}>
                {item.label}
              </Typography.Text>
              <Typography.Text className={styles.navigationDescription}>
                {item.description}
              </Typography.Text>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DesktopDrawer;
