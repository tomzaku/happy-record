import React from 'react';
import cx from 'classnames';
import { Link } from 'react-router-dom';
import Typography from '@moon-ui/typography';
import Checkbox from '@moon-ui/checkbox';
import ChecklistFieldGroupAdd from '@dreamer/detail-task-page/src/components/ChecklistFieldGroupAdd';
import { useChallenge, useFieldGroupCompletions } from '@dreamer/global';
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
  // A fields-empty group has nothing for ChecklistFieldGroupAdd to submit — same plain
  // check/uncheck marker detail-task-page's own ChecklistFieldGroup uses for the exact same case
  // (see useFieldGroupCompletions' own doc comment) instead of a submit form with nothing in it.
  const { isFieldGroupComplete, toggleFieldGroupCompletion } = useFieldGroupCompletions(checklist?.id);

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
  // The checkbox-only columns below read shorter/lighter than a bordered field-group card — the
  // grid's own top padding (sized for that taller card) reads as an oversized gap above a plain
  // checkbox row, so it's dropped whenever nothing in this row actually needs it.
  const allGroupsWithoutFields = relevantGroups.every(group => group.fields.length === 0);

  return (
    <div
      className={cx(styles.rowExpandedGroups, allGroupsWithoutFields && styles.rowExpandedGroupsNoFields)}
      onClick={event => event.stopPropagation()}
    >
      {challenge && (
        <Link to={`/challenge/${challenge.id}`} className={styles.rowExpandedDashboardLink}>
          {intl.formatMessage({ id: 'CardShare.view-dashboard', defaultMessage: 'View Dashboard' })}
        </Link>
      )}
      {relevantGroups.map(group =>
        // A fields-empty group is just its own checkbox row — the title/dot header below is
        // redundant once the group's own title is already the checkbox's label.
        group.fields.length === 0 ? (
          <label key={group.id} className={styles.rowExpandedGroupCheckboxColumn}>
            <Checkbox
              checked={isFieldGroupComplete(group.id)}
              onChange={() => toggleFieldGroupCompletion(group.id)}
            />
            <Typography.Text className={styles.rowExpandedGroupCheckboxLabel}>{group.title}</Typography.Text>
          </label>
        ) : (
          <div key={group.id} className={styles.rowExpandedGroupColumn}>
            <div className={styles.rowExpandedGroupHeader}>
              <span className={styles.rowExpandedGroupDot} style={{ backgroundColor: templateColor }} />
              <Typography.Text className={styles.rowExpandedGroupTitle}>{group.title}</Typography.Text>
            </div>
            {!checklist ? (
              <ChecklistDayRowSubmitSkeleton fieldCount={group.fields.length} />
            ) : (
              <ChecklistFieldGroupAdd
                fields={fieldsByGroup[group.id] ?? []}
                checklistTemplate={template}
                fieldGroup={group}
                checklist={checklist}
                currentDay={date.toISOString()}
                onSubmit={markCompleted}
                compact
              />
            )}
          </div>
        ),
      )}
    </div>
  );
};

export default ChecklistDayRowSubmit;
