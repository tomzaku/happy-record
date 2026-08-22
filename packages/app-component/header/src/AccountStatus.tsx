import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import { useSession } from '@dreamer/global';
import cx from 'classnames';
import styles from './AccountStatus.module.scss';

type Props = {
  /** 'drawer' renders the full labeled row for the desktop drawer's footer;
   *  'header' renders a bare icon matching the other icons in the mobile top header. */
  variant: 'drawer' | 'header';
  /** Drawer only — collapse to icon-only when the drawer itself is minimized. */
  collapsed?: boolean;
  className?: string;
};

/**
 * Account/sign-in affordance shared by the desktop drawer and the mobile header —
 * same signed-in-vs-anonymous logic as the settings page's "Sign in with Google"
 * row (see CLAUDE.md, "identity comes from the session"), just always in reach
 * instead of buried a navigation away. Anonymous taps sign in directly; already
 * signed in taps go to Settings, where the rest of the account UI lives.
 */
const AccountStatus = ({ variant, collapsed = false, className }: Props) => {
  const navigate = useNavigate();
  const { isAnonymous, email, hasBackend, signInWithGoogle } = useSession();

  if (!hasBackend) return null;

  const label = isAnonymous ? 'Sign in with Google' : email || 'Account';

  const handleClick = () => {
    if (isAnonymous) {
      signInWithGoogle().then((error) => {
        if (error) console.warn('[dreamer] Google sign-in failed:', error);
      });
    } else {
      navigate('/setting');
    }
  };

  const iconName = isAnonymous ? 'flat-color-icons:google' : 'solar:user-circle-bold';

  if (variant === 'header') {
    return (
      <Icon
        className={className}
        width={24}
        icon={iconName}
        onClick={handleClick}
      />
    );
  }

  return (
    <button
      className={cx(styles.drawerRow, collapsed && styles.collapsed, className)}
      onClick={handleClick}
      title={collapsed ? label : undefined}
    >
      <div className={styles.iconBox}>
        <Icon width={20} icon={iconName} />
      </div>
      {!collapsed && <Typography.Text className={styles.label}>{label}</Typography.Text>}
    </button>
  );
};

export default AccountStatus;
