import React from 'react';
import cx from 'classnames';
import Card from '@moon-ui/card';
import List from '@moon-ui/list';
import styles from './index.module.scss';

type SettingsCardProps = {
  className?: string;
  children: React.ReactNode;
};

/**
 * The card shell every "settings row" section on the task detail page sits in — General
 * Settings and Share today, and whatever's next. One shared shell (this) plus one shared
 * row (SettingsRow below) so a new section can't quietly end up with different padding than
 * its neighbors the way these two once did: each had hand-rolled its own header/row padding
 * math independently, and the two drifted apart pixel by pixel.
 */
export const SettingsCard = ({ className, children }: SettingsCardProps) => (
  <Card className={cx(styles.cardContainer, className)}>{children}</Card>
);

type SettingsRowProps = {
  logo: React.ReactNode;
  /** A plain string gets the row's normal title styling; pass a node (a bigger
   *  Typography.Title, say — see ChecklistGenericInfo's own header row) for a row that
   *  needs to read as a section heading rather than a list item. Same padding either way. */
  title: React.ReactNode;
  description?: React.ReactNode;
  rightComponent?: React.ReactNode;
  onClick?: () => void;
  /** Defaults to whether onClick is set — the cursor. Split from hoverBackground below
   *  because a card's own title row (ChecklistGenericInfo's "General Settings") is clickable
   *  (collapses/expands) and should still show a pointer, but reads as the section heading,
   *  not a list item, so it deliberately skips the hover fill a real row gets. */
  clickable?: boolean;
  /** Defaults to `clickable`. See `clickable` above for the one case they diverge. */
  hoverBackground?: boolean;
  /** Red title/description — the one destructive action (Delete Task) needs to read as
   *  dangerous at a glance, not just via its icon color. */
  danger?: boolean;
  className?: string;
};

export const SettingsRow = ({
  logo,
  title,
  description,
  rightComponent,
  onClick,
  clickable = !!onClick,
  hoverBackground = clickable,
  danger,
  className,
}: SettingsRowProps) => (
  <List.ItemMeta
    className={cx(
      styles.settingRow,
      clickable && styles.settingRowCursor,
      hoverBackground && styles.settingRowHover,
      danger && styles.dangerRow,
      className,
    )}
    logo={logo}
    title={title}
    description={description}
    rightComponent={rightComponent}
    noPaddingHorizontal
    onClick={onClick}
  />
);
