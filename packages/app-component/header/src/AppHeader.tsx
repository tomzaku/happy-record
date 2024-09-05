// import IconSetting from '@moon-ui/icon/IconSetting';
import { Icon } from '@iconify/react';

// Hooks
import { useNavigate } from 'react-router-dom';

import styles from './AppHeader.module.scss';

const Header = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div className={styles.left} onClick={() => navigate('/')}>
        PREGNANCY
      </div>
      <div className={styles.menu}></div>
      <Icon
        className={styles.right}
        width={24}
        icon="solar:checklist-minimalistic-linear"
        onClick={() => {
          navigate('/checklist-template');
        }}
      />
    </div>
  );
};

export default Header;
