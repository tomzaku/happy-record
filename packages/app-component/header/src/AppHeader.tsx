import IconSetting from '@moon-ui/icon/IconSetting';

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
      <IconSetting
        className={styles.right}
        onClick={() => {
          navigate('/setting');
        }}
      />
    </div>
  );
};

export default Header;
