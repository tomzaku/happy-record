import React from 'react';
import Typography from '@moon-ui/typography';
import ChecklistFieldGroupAdd from '@dreamer/detail-task-page/src/components/ChecklistFieldGroupAdd';
import { useTaskDetailModalData } from '../home-calendar/useTaskDetailModalData';
import { CalendarEventData } from '../calendar-events-view/useCalendarEvents';
import styles from './ChecklistDay.desktop.module.scss';

type Props = {
  checklistTemplateId: string;
  date: Date;
};

// A row's expanded content, behind its own expand button (see ChecklistDayRow) — reuses
// TaskDetailModal's own data hook (useTaskDetailModalData) and submit form
// (ChecklistFieldGroupAdd, compact), the same pair ChallengeQuickSubmitCard already wires up
// elsewhere, so a check-in here goes through the exact "ensure today's real Checklist row exists
// before submitting into it" path rather than a second copy of that logic. `relevantGroups` is
// already narrowed to `date` (see that hook's own comment) — a multi-group task (Push/Diamond/
// Wide push-ups on different days, say) only ever shows whichever group is actually due on this
// row's day.
const ChecklistDayRowSubmit = ({ checklistTemplateId, date }: Props) => {
  const data = React.useMemo<CalendarEventData>(
    () => ({ checklistTemplateId, date }),
    [checklistTemplateId, date],
  );
  const { template, relevantGroups, fieldsByGroup, checklist, markCompleted } = useTaskDetailModalData(data);

  // `template`/`checklist` land a beat after mount (own fetch, or the creation effect for a
  // brand-new day) — same "nothing to show yet" gate TaskDetailModal's own showSubmit uses.
  // `relevantGroups` empty means nothing due on this row's day — ChecklistDayRow already gates
  // rendering this component on that, but a re-render between those two checks (a group's own
  // schedule changing) can still land here with a stale gate, so this checks again itself.
  if (!template || !checklist || relevantGroups.length === 0) return null;

  return (
    <div className={styles.rowExpandedGroups} onClick={event => event.stopPropagation()}>
      {relevantGroups.map(group => (
        <div key={group.id} className={styles.rowExpandedGroupColumn}>
          <Typography.Text className={styles.rowExpandedGroupTitle}>{group.title}</Typography.Text>
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
      ))}
    </div>
  );
};

export default ChecklistDayRowSubmit;
