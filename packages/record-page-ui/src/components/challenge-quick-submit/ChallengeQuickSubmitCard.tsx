import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@moon-ui/card';
import Typography from '@moon-ui/typography';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import { useIntl } from '@dreamer/translation';
import { MyChallengeRow, getActiveFieldGroups } from '@dreamer/global';
import ChecklistFieldGroupAdd from '@dreamer/detail-task-page/src/components/ChecklistFieldGroupAdd';
import { useTaskDetailModalData } from '../home-calendar/useTaskDetailModalData';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import styles from './index.module.scss';

type Props = {
  challenge: MyChallengeRow;
  date: Date;
};

// One card in ChallengeQuickSubmit's row. Reuses TaskDetailModal's own data hook
// (useTaskDetailModalData, fed a synthetic "today" CalendarEventData for this challenge's
// template) and its exact submit form (ChecklistFieldGroupAdd, compact) — a check-in here goes
// through the same "ensure today's real Checklist row exists before submitting into it" path as
// the calendar's own quick-look modal, rather than a second copy of that logic.
const ChallengeQuickSubmitCard = ({ challenge, date }: Props) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const data = React.useMemo<CalendarEventData>(
    () => ({ checklistTemplateId: challenge.checklistTemplateId, date }),
    [challenge.checklistTemplateId, date],
  );
  // `relevantGroups` is already narrowed to this exact date (see useTaskDetailModalData's own
  // comment) — a multi-group challenge (Push/Diamond/Wide push-ups on different days, say) only
  // ever shows whichever group is actually due today, same as TaskDetailModal's own quick-look.
  const { template, relevantGroups, fieldsByGroup, checklist, markCompleted, updateChecklist } =
    useTaskDetailModalData(data);

  // `template`/`checklist` land a beat after mount (own fetch, or the creation effect for a
  // brand-new day) — same "nothing to show yet" gate TaskDetailModal's own showSubmit uses.
  if (!template || !checklist) return null;

  // Whether this template has *any* real field group, day-independent — not `relevantGroups`
  // (already narrowed to today), or a multi-group challenge whose groups are all scheduled on
  // other days (Push Monday, Diamond Wednesday, Wide Friday, say) would misread as a plain
  // check/uncheck task and show the wrong "Mark as done" control on a day none of its groups are
  // actually due.
  const hasFieldGroups = getActiveFieldGroups(template.fieldGroups ?? []).length > 0;
  // A field-group challenge with nothing due today has nothing to check in on right now — skip
  // it rather than show an empty or misleading card; a genuinely fields-free challenge (plain
  // check/uncheck) has no "due day" of its own to gate on, so it always shows.
  if (hasFieldGroups && relevantGroups.length === 0) return null;

  const isPlainTask = !hasFieldGroups;
  const isDone = isPlainTask && Boolean(checklist.completedAt);

  // Shared across every card this component renders (one for a plain task, one per field group
  // otherwise — see below) — logo on the left, challenge title + (when there's a group to name)
  // that group's own name stacked on the right, both navigating to the real task page.
  const renderHeader = (groupTitle?: string) => (
    <div
      className={styles.itemHeader}
      onClick={() => navigate(`/task/${template.id}?currentDay=${date.toISOString()}`)}
    >
      <div className={styles.itemBadge}>
        <Icon width={16} icon={template.avatar.name || 'solar:checklist-line-duotone'} color="#fff" />
      </div>
      <div className={styles.itemHeaderText}>
        <Typography.Text className={styles.itemTitle}>{template.title}</Typography.Text>
        {groupTitle && <Typography.Text className={styles.groupName}>{groupTitle}</Typography.Text>}
      </div>
      <Icon icon="solar:alt-arrow-right-linear" width={14} className={styles.itemChevron} />
    </div>
  );

  if (isPlainTask) {
    return (
      <Card className={styles.itemCard}>
        {renderHeader()}
        <div className={styles.plainRow} onClick={e => e.stopPropagation()}>
          <Checkbox
            defaultChecked={isDone}
            onChange={event => {
              updateChecklist({
                ...checklist,
                completedAt: event.target.checked ? new Date().toISOString() : undefined,
              });
            }}
          />
          <Typography.Text className={styles.plainLabel}>
            {isDone
              ? intl.formatMessage({ id: 'ChallengeQuickSubmit.done', defaultMessage: 'Done today' })
              : intl.formatMessage({ id: 'ChallengeQuickSubmit.mark-done', defaultMessage: 'Mark as done' })}
          </Typography.Text>
        </div>
      </Card>
    );
  }

  // A multi-group challenge (Push/Diamond/Wide push-ups, say) gets its own card per group due
  // today, rather than one card stacking every group's fields under a single header — each
  // group's submission is otherwise unrelated to the others due the same day.
  return (
    <>
      {relevantGroups.map(group => (
        <Card key={group.id} className={styles.itemCard}>
          {renderHeader(group.title)}
          <div onClick={e => e.stopPropagation()}>
            <ChecklistFieldGroupAdd
              fields={fieldsByGroup[group.id] ?? []}
              checklistTemplate={template}
              fieldGroup={group}
              checklist={checklist}
              currentDay={date.toISOString()}
              onSubmit={markCompleted}
              compact
            />
          </div>
        </Card>
      ))}
    </>
  );
};

export default ChallengeQuickSubmitCard;
