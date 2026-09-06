// import IconSetting from '@moon-ui/icon/IconSetting';

// Hooks
import { useNavigate } from 'react-router-dom';

import styles from './AppHeader.module.scss';
import Icon from '@moon-ui/icon/Icon';
import AccountStatus from './AccountStatus';
import TaskSearch from './TaskSearch';

const Header = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div className={styles.navItem} onClick={() => navigate('/')}>
        <img className={styles.navLogo} src="/logo/dreamer.svg" alt="Dreamer" />
      </div>
      <div className={styles.navItem}>
        <Icon
          className={styles.navIcon}
          width={24}
          icon="solar:notes-line-duotone"
          onClick={() => {
            navigate('/notes');
          }}
        />
      </div>
      <div className={styles.navItem}>
        <Icon
          className={styles.navIcon}
          width={24}
          icon="solar:cup-star-line-duotone"
          onClick={() => {
            navigate('/challenges');
          }}
        />
      </div>
      <div className={styles.navItem}>
        <Icon
          className={styles.navIcon}
          width={24}
          icon="solar:chart-square-line-duotone"
          onClick={() => {
            navigate('/dashboard');
          }}
        />
      </div>
      <div className={styles.navItem}>
        <TaskSearch variant="header" className={styles.navIcon} />
      </div>
      {/* Settings is reachable via the account icon below (AccountStatus navigates
          there once signed in), so no separate settings icon here. */}
      <div className={styles.navItem}>
        <AccountStatus variant="header" className={styles.navIcon} />
      </div>
    </div>
  );
};

export default Header;
