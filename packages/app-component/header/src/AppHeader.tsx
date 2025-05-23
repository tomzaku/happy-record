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
        DREAMER
      </div>
      <div className={styles.menu}>
        <Icon
          className={styles.right}
          width={24}
          icon="bytesize:book"
          onClick={() => {
            navigate('/story');
          }}
        />
        <Icon
          className={styles.right}
          width={24}
          icon="solar:checklist-minimalistic-linear"
          onClick={() => {
            navigate('/checklist-template');
          }}
        />
      </div>
    </div>
  );
};

export default Header;
