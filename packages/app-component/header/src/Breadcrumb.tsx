import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '@moon-ui/icon/Icon';
import styles from './Breadcrumb.module.scss';

export type BreadcrumbItem = { label: string; to?: string };

/**
 * "Section / Current page" — one level, matching `DesktopDrawer`'s own nav labels ("Tasks",
 * "Notes", "Challenges") so the trail always names the section a page actually lives under. The
 * last item is never a link (it's where you already are); every other item is, when it has a
 * `to`. Shared by `detail-task-page` and `challenge-dashboard-page-ui` rather than each page
 * rolling its own — `notes` pages don't use this (see CLAUDE.md).
 */
const Breadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className={styles.breadcrumb} aria-label="Breadcrumb">
    {items.map((item, index) => (
      <React.Fragment key={`${item.label}-${index}`}>
        {index > 0 && <Icon icon="solar:alt-arrow-right-linear" width={12} className={styles.separator} />}
        {item.to && index < items.length - 1 ? (
          <Link to={item.to} className={styles.crumbLink}>
            {item.label}
          </Link>
        ) : (
          <span className={styles.crumbCurrent}>{item.label}</span>
        )}
      </React.Fragment>
    ))}
  </nav>
);

export default Breadcrumb;
