import React from 'react';
import cx from 'classnames';
import { Icon } from '@moon-ui/icon/Icon';
import Typography from '@moon-ui/typography';
import styles from './CollapsibleSection.module.scss';

type Props = {
  icon: string;
  label: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
};

/** A plain label + chevron header that tucks its content away until tapped — no nested Card
 * border/shadow of its own, since it already lives inside the field group's own Card (see
 * ChecklistFieldGroup's own renderGroupContent). Used for Metrics/Note/History, the three
 * sections read occasionally rather than every day; Submit stays outside this, always open,
 * since that's the one thing a group's card exists to do. */
const CollapsibleSection = ({ icon, label, defaultCollapsed = true, children }: Props) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsCollapsed(prev => !prev)}
        aria-expanded={!isCollapsed}
      >
        <Icon
          className={cx(styles.chevron, !isCollapsed && styles.chevronOpen)}
          width={14}
          icon="solar:alt-arrow-right-linear"
        />
        <Icon className={styles.icon} width={16} icon={icon} />
        <Typography.Text className={styles.label}>{label}</Typography.Text>
      </button>
      {!isCollapsed && <div className={styles.body}>{children}</div>}
    </div>
  );
};

export default CollapsibleSection;
