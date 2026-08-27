import React from 'react';
import cx from 'classnames';
import Icon from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import SearchDialog from './SearchDialog';
import styles from './TaskSearch.module.scss';

type Props = {
  /** 'drawer' renders the full labeled row for the desktop drawer's nav list; 'header' renders
   *  a bare icon matching the other icons in the mobile top header — same split as AccountStatus. */
  variant: 'drawer' | 'header';
  /** Drawer only — collapse to icon-only when the drawer itself is minimized. */
  collapsed?: boolean;
  className?: string;
};

/** Search trigger shared by the mobile header and the desktop drawer — owns the dialog's open
 *  state itself so either caller only has to drop this in, same as AccountStatus. */
const TaskSearch = ({ variant, collapsed = false, className }: Props) => {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      {variant === 'header' ? (
        <Icon
          className={className}
          width={24}
          icon="solar:magnifer-linear"
          onClick={() => setVisible(true)}
        />
      ) : (
        <button
          className={cx(styles.drawerRow, collapsed && styles.collapsed, className)}
          onClick={() => setVisible(true)}
          title={collapsed ? 'Search' : undefined}
          aria-label="Search"
        >
          <div className={styles.iconBox}>
            <Icon width={20} icon="solar:magnifer-linear" />
          </div>
          {!collapsed && <Typography.Text className={styles.label}>Search</Typography.Text>}
        </button>
      )}
      <SearchDialog visible={visible} onDismiss={() => setVisible(false)} />
    </>
  );
};

export default TaskSearch;
export { TaskSearch };
