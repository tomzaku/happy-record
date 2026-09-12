// import IconSetting from '@moon-ui/icon/IconSetting';

// Hooks
import { useNavigate, useLocation } from 'react-router-dom';
import cx from 'classnames';

import styles from './AppHeader.module.scss';
import Icon from '@moon-ui/icon/Icon';
import AccountStatus from './AccountStatus';
import TaskSearch from './TaskSearch';

// Same shape as DesktopDrawer's own navigationItems/isActivePath — kept separate rather than
// shared since this bar has no label/description, just an icon per route.
const navigationItems = [
  { id: 'task', icon: 'material-symbols:checklist', path: '/' },
  { id: 'note', icon: 'solar:notes-line-duotone', path: '/notes' },
  { id: 'challenges', icon: 'solar:cup-star-line-duotone', path: '/challenges' },
  { id: 'dashboard', icon: 'solar:chart-square-line-duotone', path: '/dashboard' },
];

// TaskSearch + AccountStatus are two more equal-width .navItem slots after the mapped
// ones — the active-tab indicator's width/position math needs the real total.
const SLOT_COUNT = navigationItems.length + 2;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/' || Boolean(location.pathname.match(/^\/task\/[^/]+$/));
    }
    return location.pathname.startsWith(path);
  };

  const activeIndex = navigationItems.findIndex(item => isActivePath(item.path));

  return (
    <div className={styles.container}>
      {navigationItems.map(item => (
        <div
          key={item.id}
          className={styles.navItem}
          onClick={() => navigate(item.path)}
        >
          <Icon
            className={cx(styles.navIcon, isActivePath(item.path) && styles.activeNavIcon)}
            width={24}
            icon={item.icon}
          />
        </div>
      ))}
      <div className={styles.navItem}>
        <TaskSearch variant="header" className={styles.navIcon} />
      </div>
      {/* Settings is reachable via the account icon below (AccountStatus navigates
          there once signed in), so no separate settings icon here. */}
      <div className={styles.navItem}>
        <AccountStatus variant="header" className={styles.navIcon} />
      </div>
      {/* Every .navItem is an equal 1/SLOT_COUNT share of the container's width (all
          flex: 1), so sliding this by activeIndex * 100% of its own width lines it up
          under whichever tab is active with no per-item measurement needed. */}
      <div
        className={styles.activeIndicator}
        style={{
          width: `${100 / SLOT_COUNT}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          opacity: activeIndex === -1 ? 0 : 1,
        }}
      />
    </div>
  );
};

export default Header;
