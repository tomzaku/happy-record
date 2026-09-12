import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import { motion } from 'motion/react';
import Typography from '@moon-ui/typography';
import styles from './index.module.scss';

export { ChecklistFieldGroupTab } from './enums';

// One shared header for both desktop and mobile — this used to be two near-identical files (a
// `.desktop`/`.mobile` split with no real device-specific layout between them), which just meant
// a fix landed on one and quietly drifted out of sync with the other (the settings cog pinned to
// the row's own right edge, the status text sitting flush under the title with no gap) until
// someone noticed. The desktop/mobile split is for a genuine layout difference, not a default to
// reach for on every component — this one never had one.
const ChecklistFieldGroupHeader = ({
  renderIndicator,
  renderTitle = () => null,
  renderMenu,
  renderStatus,
  isCollapsed = false,
  onToggleCollapse,
}: {
  /** A small done/pending marker at the row's own left edge, before the collapse chevron — the
   * accordion's own "is this sub-task handled yet" signal (see useFieldGroupAccordion). Optional
   * since a caller with no such concept (none, today) just omits it. */
  renderIndicator?: () => React.ReactNode;
  renderTitle?: () => React.ReactNode;
  /** The group's own settings menu (ChecklistFieldGroupMenu) — pinned to the row's own right
   * edge (see .titleRow's `justify-content: space-between`), not vertically centered against the
   * taller title+status block next to it. */
  renderMenu?: () => React.ReactNode;
  /** The group's own schedule status ("Scheduled today" / "Not scheduled today · Next Mon") —
   * sits flush under the title, shown either way rather than only when not scheduled. */
  renderStatus?: () => React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div onClick={onToggleCollapse} className={styles.titleContainer}>
          {renderIndicator?.()}
          {onToggleCollapse && (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: isCollapsed ? -180 : 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className={styles.iconGroup}
            >
              <Icon
                className={styles.collapseIcon}
                width={20}
                icon="solar:alt-arrow-down-line-duotone"
              />
            </motion.div>
          )}
          <div className={styles.titleGroup}>
            <Typography.Title level={4} noMargin>
              {renderTitle()}
            </Typography.Title>
            {renderStatus?.()}
          </div>
        </div>
        {renderMenu?.()}
      </div>
    </div>
  );
};

export default ChecklistFieldGroupHeader;
