import React from 'react';
import { Link } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import ChecklistFieldGroupAdd from '@dreamer/detail-task-page/src/components/ChecklistFieldGroupAdd';
import { useChallenge } from '@dreamer/global';
import { useIntl } from '@dreamer/translation';
import { useTaskDetailModalData } from '../home-calendar/useTaskDetailModalData';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import ChecklistDayRowSubmitSkeleton from './ChecklistDayRowSubmitSkeleton';
import { UNCHOSEN_AVATAR_COLOR } from '../calendar-events-view/resolveTaskColor';
import styles from './ChecklistDay.desktop.module.scss';

type Props = {
  checklistTemplateId: string;
  date: Date;
};

// A row's expanded content, behind its own expand button (see ChecklistDayRow, and
// ChecklistDayMobileRow for the mobile equivalent) — reuses TaskDetailModal's own data hook
// (useTaskDetailModalData) and submit form (ChecklistFieldGroupAdd, compact), so a check-in here
// goes through the exact "ensure today's real Checklist row exists before submitting into it"
// path rather than a second copy of that logic. `relevantGroups` is
// already narrowed to `date` (see that hook's own comment) — a multi-group task (Push/Diamond/
// Wide push-ups on different days, say) only ever shows whichever group is actually due on this
// row's day.
const ChecklistDayRowSubmit = ({ checklistTemplateId, date }: Props) => {
  const intl = useIntl();
  const data = React.useMemo<CalendarEventData>(
    () => ({ checklistTemplateId, date }),
    [checklistTemplateId, date],
  );
  const { template, relevantGroups, fieldsByGroup, checklist, markCompleted } = useTaskDetailModalData(data);
  // Only renders once a real challenge row exists for this template — a public template doesn't
  // necessarily have one (that's a separate opt-in via CardShare's "Share everyone's check-ins").
  const { getChallengeForTemplate } = useChallenge();
  const challenge = getChallengeForTemplate(checklistTemplateId);

  // `template` lands a beat after mount (own fetch) — same "nothing to show yet" gate
  // TaskDetailModal's own showSubmit uses. `relevantGroups` empty means nothing due on this
  // row's day — ChecklistDayRow already gates rendering this component on that, but a re-render
  // between those two checks (a group's own schedule changing) can still land here with a stale
  // gate, so this checks again itself. Neither is worth a skeleton: there's no known group shape
  // to skeleton yet, so this stays a plain "render nothing" gate for both.
  if (!template || relevantGroups.length === 0) return null;
  // `checklist` itself lands a further beat behind `template` (the creation effect for a
  // brand-new day, or its own fetch) — but `relevantGroups`/`fieldsByGroup` are already known by
  // this point, so each group's column skeletons instead of the whole row disappearing.

  const templateColor =
    template.avatar.color && template.avatar.color !== UNCHOSEN_AVATAR_COLOR
      ? template.avatar.color
      : 'var(--almanac-accent)';

  return (
    <div className={styles.rowExpandedGroups} onClick={event => event.stopPropagation()}>
      {challenge && (
        <Link to={`/challenge/${challenge.id}`} className={styles.rowExpandedDashboardLink}>
          {intl.formatMessage({ id: 'CardShare.view-dashboard', defaultMessage: 'View Dashboard' })}
        </Link>
      )}
      {relevantGroups.map(group => (
        <div key={group.id} className={styles.rowExpandedGroupColumn}>
          <div className={styles.rowExpandedGroupHeader}>
            <span className={styles.rowExpandedGroupDot} style={{ backgroundColor: templateColor }} />
            <Typography.Text className={styles.rowExpandedGroupTitle}>{group.title}</Typography.Text>
          </div>
          {checklist ? (
            <ChecklistFieldGroupAdd
              fields={fieldsByGroup[group.id] ?? []}
              checklistTemplate={template}
              fieldGroup={group}
              checklist={checklist}
              currentDay={date.toISOString()}
              onSubmit={markCompleted}
              compact
            />
          ) : (
            <ChecklistDayRowSubmitSkeleton fieldCount={group.fields.length} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ChecklistDayRowSubmit;
