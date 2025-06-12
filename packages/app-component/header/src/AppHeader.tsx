// import IconSetting from '@moon-ui/icon/IconSetting';

// Hooks
import { useNavigate } from 'react-router-dom';

import styles from './AppHeader.module.scss';
import Icon from '@moon-ui/icon/Icon';

const Header = () => {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div className={styles.left} onClick={() => navigate('/')}>
        DREAMER
      </div>
      <div className={styles.right}>
        <Icon
          className={styles.rightIcon}
          width={24}
          icon="solar:notes-line-duotone"
          onClick={() => {
            navigate('/notes');
          }}
        />
        <Icon
          className={styles.rightIcon}
          width={24}
          icon="solar:settings-linear"
          onClick={() => {
            navigate('/setting');
          }}
        />
      </div>
      {/* <div className={styles.right}> */}
      {/*   <Icon */}
      {/*     className={styles.rightIcon} */}
      {/*     width={24} */}
      {/*     icon="bytesize:book" */}
      {/*     onClick={() => { */}
      {/*       navigate('/story'); */}
      {/*     }} */}
      {/*   /> */}
      {/*   <Icon */}
      {/*     className={styles.rightIcon} */}
      {/*     width={24} */}
      {/*     icon="solar:checklist-minimalistic-linear" */}
      {/*     onClick={() => { */}
      {/*       navigate('/checklist-template'); */}
      {/*     }} */}
      {/*   /> */}
      {/* </div> */}
    </div>
  );
};

export default Header;
