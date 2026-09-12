import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { formatTemplateSchedule } from './checklistDayHelpers';
import { UNCHOSEN_AVATAR_COLOR } from '../calendar-events-view/resolveTaskColor';
import styles from './index.module.scss';

type Props = {
  id: string;
  isLast: boolean;
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  updateChecklist: ReturnType<typeof useChecklist>['updateChecklist'];
  onNavigate: (checklistTemplateId: string, checklistId: string, clientOnly?: boolean) => void;
};

// A single row of the mobile Today list — pulled into its own file to keep index.mobile.tsx
// under the repo's ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200 lines").
// Mirrors ChecklistDayRow.desktop's own layout (checkbox, colored icon badge, title/schedule,
// trailing chevron) rather than the flatter row this used to render inline.
const ChecklistDayMobileRow = ({ id, isLast, checklist, checklistTemplate, updateChecklist, onNavigate }: Props) => {
  const intl = useIntl();
  const currentChecklist = checklist[id];
  const currentChecklistTemplate = checklistTemplate[currentChecklist.checklistTemplateId];
  const completed = Boolean(currentChecklist?.completedAt);
  const avatarColor = currentChecklistTemplate?.avatar.color;
  const hasCustomColor = Boolean(avatarColor && avatarColor !== UNCHOSEN_AVATAR_COLOR);
  const color = hasCustomColor ? avatarColor! : 'var(--almanac-accent)';
  const badgeBackground = hasCustomColor
    ? `${color}33`
    : 'color-mix(in srgb, var(--almanac-accent) 10%, transparent)';

  return (
    <div className={cx(styles.checklistItem, isLast && styles.lastChecklistItem, completed && styles.completedItem)}>
      <div onClick={e => e.stopPropagation()} className={styles.rowCheckbox}>
        <Checkbox
          defaultChecked={completed}
          className={styles.checkbox}
          onChange={event => {
            event.stopPropagation();
            updateChecklist({
              ...currentChecklist,
              completedAt: event.target.checked ? new Date().toISOString() : undefined,
            });
          }}
        />
      </div>
      <div className={styles.rowIconBadge} style={{ backgroundColor: badgeBackground }}>
        <Icon
          width={18}
          height={18}
          color={color}
          fill={color}
          icon={currentChecklistTemplate?.avatar.name || 'solar:settings-linear'}
        />
      </div>
      <div
        onClick={() =>
          onNavigate(currentChecklist.checklistTemplateId, currentChecklist.id, currentChecklist.clientOnly)
        }
        className={styles.titleRow}
      >
        <Typography.Text className={styles.title}>{currentChecklistTemplate?.title}</Typography.Text>
        <Typography.Text className={styles.rowSubtitle}>
          {formatTemplateSchedule(currentChecklistTemplate)}
        </Typography.Text>
      </div>
      {currentChecklistTemplate?.visibility === 'public' && (
        <Icon
          className={styles.challengeBadge}
          width={18}
          height={18}
          icon="solar:cup-star-bold-duotone"
          title={intl.formatMessage({ id: 'ChecklistToday.challenge-badge', defaultMessage: 'Challenge' })}
        />
      )}
      <Icon className={styles.rowChevron} width={18} icon="solar:alt-arrow-right-linear" />
    </div>
  );
};

export default ChecklistDayMobileRow;
