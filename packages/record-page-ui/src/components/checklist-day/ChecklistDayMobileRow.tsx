import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import Typography from '@moon-ui/typography';
import cx from 'classnames';
import { useIntl } from '@dreamer/translation';
import { formatTemplateSchedule, getHasQuickSubmit } from './checklistDayHelpers';
import { UNCHOSEN_AVATAR_COLOR } from '../calendar-events-view/resolveTaskColor';
import ChecklistDayRowSubmit from './ChecklistDayRowSubmit';
import styles from './index.module.scss';

type Props = {
  id: string;
  date: Date;
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  updateChecklist: ReturnType<typeof useChecklist>['updateChecklist'];
  onNavigate: (checklistTemplateId: string, checklistId: string, clientOnly?: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
};

// A single row of the mobile Today list — pulled into its own file to keep index.mobile.tsx
// under the repo's ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200 lines").
// Mirrors ChecklistDayRow.desktop's own layout (checkbox, colored icon badge, title/schedule,
// expand chevron + inline ChecklistDayRowSubmit) — a challenge/field-group task's quick check-in
// now lives right under its own row here too, the same as desktop, rather than in a separate
// "Challenge check-in" widget at the top of the page.
const ChecklistDayMobileRow = ({
  id,
  date,
  checklist,
  checklistTemplate,
  updateChecklist,
  onNavigate,
  expanded,
  onToggleExpanded,
}: Props) => {
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
  // Same "nothing more to show than the checkbox already has" rule ChecklistDayRow.desktop
  // follows — a plain check/uncheck task gets no expand affordance at all.
  const hasQuickSubmit = getHasQuickSubmit(currentChecklistTemplate, date);

  return (
    <div className={styles.taskRowContainer}>
      <div className={cx(styles.checklistItem, completed && styles.completedItem)}>
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
        {hasQuickSubmit && (
          <button
            type="button"
            className={styles.rowExpandButton}
            onClick={event => {
              event.stopPropagation();
              onToggleExpanded();
            }}
            aria-label={
              expanded
                ? intl.formatMessage({ id: 'ChecklistToday.collapse-task', defaultMessage: 'Collapse' })
                : intl.formatMessage({ id: 'ChecklistToday.expand-task', defaultMessage: 'Expand' })
            }
          >
            <Icon
              width={18}
              icon="solar:alt-arrow-down-linear"
              className={cx(styles.rowExpandIcon, expanded && styles.rowExpandIconOpen)}
            />
          </button>
        )}
      </div>
      {hasQuickSubmit && expanded && (
        <ChecklistDayRowSubmit checklistTemplateId={currentChecklist.checklistTemplateId} date={date} />
      )}
    </div>
  );
};

export default ChecklistDayMobileRow;
