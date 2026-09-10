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

// Same fixed hashed-color palette as challenge-dashboard-page-ui's ParticipantAvatar
// (each ≥4.5:1 contrast with the white initial) — duplicated locally since this
// package doesn't depend on that page package, not worth a shared export for one
// more caller yet.
const AVATAR_COLORS = ['#2a78d6', '#c9550f', '#188a63', '#8a4fd1', '#c23a63', '#0f8f8f', '#a86a00', '#5a67c9'];

const hashString = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const initialOf = (name: string) => {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
};

type AvatarProps = {
  name: string;
  avatarUrl?: string;
  size: number;
  className?: string;
  onClick?: () => void;
};

/**
 * The signed-in user's own Google photo, falling back to an initials-on-a-hashed
 * -color badge — same shape as `ParticipantAvatar`'s img/initials fallback.
 * `React.useState` (not a plain `onError` prop swap) so a broken image doesn't
 * keep re-firing `onError` once it stops being rendered.
 */
const AccountAvatar = ({ name, avatarUrl, size, className, onClick }: AvatarProps) => {
  const [broken, setBroken] = React.useState(false);
  const showPhoto = !!avatarUrl && !broken;

  return (
    <span
      className={cx(styles.avatar, className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: showPhoto ? undefined : AVATAR_COLORS[hashString(name) % AVATAR_COLORS.length],
      }}
      onClick={onClick}
    >
      {showPhoto ? (
        <img src={avatarUrl} alt="" className={styles.photo} onError={() => setBroken(true)} />
      ) : (
        initialOf(name)
      )}
    </span>
  );
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
  const { isAnonymous, email, displayName, avatarUrl, hasBackend, signInWithGoogle } = useSession();

  if (!hasBackend) return null;

  const label = isAnonymous ? 'Sign in with Google' : displayName || email || 'Account';

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
    return isAnonymous ? (
      <Icon className={className} width={24} icon={iconName} onClick={handleClick} />
    ) : (
      <AccountAvatar
        className={className}
        size={24}
        name={label}
        avatarUrl={avatarUrl}
        onClick={handleClick}
      />
    );
  }

  return (
    <button
      className={cx(styles.drawerRow, collapsed && styles.collapsed, className)}
      onClick={handleClick}
      title={collapsed ? label : undefined}
      aria-label={label}
    >
      <div className={styles.iconBox}>
        {isAnonymous ? (
          <Icon width={20} icon={iconName} />
        ) : (
          <AccountAvatar size={collapsed ? 32 : 28} name={label} avatarUrl={avatarUrl} />
        )}
      </div>
      {!collapsed && <Typography.Text className={styles.label}>{label}</Typography.Text>}
    </button>
  );
};

export default AccountStatus;
