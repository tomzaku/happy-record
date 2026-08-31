import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '@moon-ui/icon/Icon';
import styles from './Breadcrumb.module.scss';

export type BreadcrumbItem = {
  label: React.ReactNode;
  to?: string;
  /** Only meaningful on the last item — the section label before it (`Task`, `Challenge`, ...)
   * never carries one; this is what makes the crumb double as the page's own icon+title heading,
   * not just a trail of link text. */
  icon?: { name: string; color?: string };
};

/**
 * "Section › [icon] Current page" — one level, the section label matching `DesktopDrawer`'s own
 * nav wording ("Task", "Challenge") so the trail always names where a page lives, and the last
 * item doubling as that page's own heading (its icon + title) rather than sitting as a second,
 * separate title underneath. The section label is a real link back to that section's list (mobile
 * has no persistent drawer nav to fall back on, and even on desktop a click here is a shorter path
 * than reaching over to the sidebar). The last item's `label` can be any node (not just text) so a
 * caller can drop in something interactive, like detail-task-page's own inline-editable title.
 * Shared by `detail-task-page` and `challenge-dashboard-page-ui` rather than each page rolling its
 * own — `notes` pages don't use this (see CLAUDE.md).
 */
const Breadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className={styles.breadcrumb} aria-label="Breadcrumb">
    {items.map((item, index) => {
      const isLast = index === items.length - 1;
      return (
        <React.Fragment key={index}>
          {index > 0 && <Icon icon="solar:alt-arrow-right-linear" width={14} className={styles.separator} />}
          {item.icon && (
            <Icon icon={item.icon.name} width={24} color={item.icon.color} className={styles.titleIcon} />
          )}
          {item.to && !isLast ? (
            <Link to={item.to} className={styles.crumbLabel}>
              {item.label}
            </Link>
          ) : (
            <span className={isLast ? styles.crumbCurrent : styles.crumbLabel}>{item.label}</span>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

export default Breadcrumb;
