import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import { motion } from 'motion/react';

import styles from './index.desktop.module.scss';
import Typography from '@moon-ui/typography';

// No more tab row — a group renders as one single stacked view now (Submit, metric glance, note,
// History; see ChecklistFieldGroup's own renderGroupContent) instead of Home/History/Metrics/
// Submit tabs nobody but the person who built it knew to click between.
const ChecklistFieldGroupHeader = ({
  renderTitle = () => null,
  renderMenu,
  renderStatus,
  isCollapsed = false,
  onToggleCollapse,
}: {
  renderTitle?: () => React.ReactNode;
  /** The group's own settings menu (ChecklistFieldGroupMenu). Sits right after the title text, on
   * the title's own row — not vertically centered against the taller block `renderStatus`'s own
   * row adds below it. */
  renderMenu?: () => React.ReactNode;
  /** The group's own schedule status ("Scheduled today" / "Not scheduled today · Next Mon") —
   * its own row under the title, shown either way rather than only when not scheduled. */
  renderStatus?: () => React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.left}>
        <div className={styles.titleRow}>
          <div onClick={onToggleCollapse} className={styles.titleContainer}>
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
            <div>
              <Typography.Title level={4} noMargin>
                {renderTitle()}
              </Typography.Title>
              {renderStatus && <div>{renderStatus()}</div>}
              </div>
          </div>
          {renderMenu?.()}
        </div>
      </div>
    </div>
  );
};

export default ChecklistFieldGroupHeader;


