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
          icon="solar:cup-star-line-duotone"
          onClick={() => {
            navigate('/challenges');
          }}
        />
        <Icon
          className={styles.rightIcon}
          width={24}
          icon="solar:chart-square-line-duotone"
          onClick={() => {
            navigate('/dashboard');
          }}
        />
        <TaskSearch variant="header" className={styles.rightIcon} />
        {/* Settings is reachable via the account icon below (AccountStatus navigates
            there once signed in), so no separate settings icon here. */}
        <AccountStatus variant="header" className={styles.rightIcon} />
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
