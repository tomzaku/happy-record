import React from 'react';
import { Icon } from '@moon-ui/icon/Icon';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';

type Styles = {
  rowExpandButton: string;
  rowExpandIcon: string;
  rowExpandIconOpen: string;
};

type Props = {
  expandableIds: string[];
  isSectionExpanded: (ids: string[]) => boolean;
  onToggleSectionExpanded: (ids: string[]) => void;
  // Desktop and mobile each keep their own CSS module (ChecklistDay.desktop.module.scss vs.
  // checklist-day/index.module.scss) — the class names line up, but this can't `import styles`
  // from either one directly, so each caller passes its own.
  styles: Styles;
};

// A section header's own "expand/collapse all" chevron — toggles every one of that section's
// rows' own quick-submit field-group area at once (see useFieldGroupExpansion). Shared by
// desktop's ChecklistDayTaskList and mobile's own section headers.
const SectionExpandButton = ({ expandableIds, isSectionExpanded, onToggleSectionExpanded, styles }: Props) => {
  const intl = useIntl();
  if (expandableIds.length === 0) return null;

  const expanded = isSectionExpanded(expandableIds);
  return (
    <button
      type="button"
      className={styles.rowExpandButton}
      onClick={() => onToggleSectionExpanded(expandableIds)}
      aria-label={
        expanded
          ? intl.formatMessage({ id: 'ChecklistToday.collapse-all-tasks', defaultMessage: 'Collapse all' })
          : intl.formatMessage({ id: 'ChecklistToday.expand-all-tasks', defaultMessage: 'Expand all' })
      }
    >
      <Icon
        width={16}
        icon="solar:alt-arrow-down-linear"
        className={cx(styles.rowExpandIcon, expanded && styles.rowExpandIconOpen)}
      />
    </button>
  );
};

export default SectionExpandButton;
