import React from 'react';
import {
  useChecklist,
  useChecklistTemplates,
  ChecklistTemplate,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  getActiveFieldGroups,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import styles from './ChecklistToday.desktop.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import { format, isToday } from 'date-fns';
import AddInlineTask from '../AddInlineTask';
import { getLunarDate, getLunarPhraseId } from '../../utils/lunarDate';

// Mirrors ChecklistGenericInfo's own ("General Settings") schedule rendering: once a template
// has field groups, its real schedule is the merged union of every *active* group's own days
// (@dreamer/global's getEffectiveDayOfWeek), not the template-level `repeat` this used to read
// alone — that can be stale, or entirely unset once schedules are only ever edited per group
// (see useChecklistTemplates.tsx's withSyncedRepeat), which is why this showed "No schedule" for
// a template whose groups very much did have one. Time-of-day is dropped in that case for the
// same reason ChecklistGenericInfo drops it there: no schedule here, template-level or per-group,
// has ever gated on time, so pairing a real merged day list with a leftover default time would
// overstate how precise it is.
const formatTemplateSchedule = (template?: ChecklistTemplate): string => {
  if (!template) return 'No schedule';

  if (getActiveFieldGroups(template.fieldGroups ?? []).length > 0) {
    return formatDaysOfWeek(getEffectiveDayOfWeek(template) ?? '*');
  }

  if (!template.repeat?.dayOfWeek) return 'No schedule';
  const time = `${template.repeat.hour.padStart(2, '0')}:${template.repeat.minute.padStart(2, '0')}`;
  return `${time} • ${formatDaysOfWeek(template.repeat.dayOfWeek)}`;
};

// The row's own right-aligned time — only meaningful for a template with no
// field groups (see formatTemplateSchedule's own comment on why a merged
// per-group schedule has no single time to show).
const getScheduledTimeLabel = (template?: ChecklistTemplate): string | undefined => {
  if (!template?.repeat?.hour || getActiveFieldGroups(template.fieldGroups ?? []).length > 0) {
    return undefined;
  }
  return format(new Date(0, 0, 0, Number(template.repeat.hour), Number(template.repeat.minute)), 'h:mm');
};

const ChecklistTodayDesktop = ({
  date,
  selectedTag,
}: {
  date: Date;
  selectedTag?: string;
}) => {
  const { getChecklistByGivingDate, updateChecklist, checklistsLoading } = useChecklist();
  const { checklistTemplate, templatesLoading } = useChecklistTemplates();
  const navigate = useNavigate();
  const intl = useIntl();

  // `getChecklistByGivingDate` is itself a `useCallback` chain rooted in
  // `checklist`/`checklistTemplate`/`selectedChecklistTemplates` (see
  // useChecklists.tsx), so depending on the function directly here — not
  // hand-picking which underlying pieces "should" matter — is what makes
  // this recompute on every relevant change, `selectedChecklistTemplates`
  // included. The previous version snapshotted this into local state from
  // a `useEffect` keyed on `[date, selectedTag, checklistTemplate]`, which
  // never mentioned `selectedChecklistTemplates` at all: a template synced
  // in for the first time updates that list a beat after `checklistTemplate`
  // itself (see useChecklistTemplates.tsx), a change this component had no
  // way to notice — it would show "No tasks found!" while the weekly
  // calendar right next to it (already `useMemo`'d the same way this now
  // is) correctly showed the same task. `AddInlineTask`'s manual re-fetch
  // after creating a task is gone too — creating one already updates the
  // same underlying state, so this recomputes on its own.
  const { checklist, checklistIds: checklistByGivingDateIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  const lunar = React.useMemo(() => getLunarDate(date), [date]);
  const lunarPhrase = getLunarPhraseId(lunar.day);

  // `checklistByGivingDateIds` is empty both while the templates/checklists
  // fetch is still in flight and once it's genuinely resolved with nothing —
  // indistinguishable without these flags. Showing "No tasks found!" during
  // the former flashes a wrong, momentary answer on every fresh page load.
  if ((templatesLoading || checklistsLoading) && checklistByGivingDateIds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyBody}>
          <Icon
            width={40}
            icon="svg-spinners:180-ring"
            className={styles.iconEmpty}
          />
          <Typography.Text className={styles.emptyDescription}>
            {intl.formatMessage({
              id: 'ChecklistToday.loading',
              defaultMessage: 'Fetching your tasks…',
            })}
          </Typography.Text>
        </div>
      </div>
    );
  }

  if (checklistByGivingDateIds.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyBody}>
          <Icon
            width={80}
            icon="clarity:sad-face-line"
            className={styles.iconEmpty}
          />
          <Typography.Title level={3} noMargin>
            {intl.formatMessage({
              id: 'ChecklistToday.no-record',
              defaultMessage: 'No tasks found!',
            })}
          </Typography.Title>
          <Typography.Text className={styles.emptyDescription}>
            Create your first task to get started with your daily routine.
          </Typography.Text>
        </div>
        <AddInlineTask className={styles.quickAddTask} />
      </div>
    );
  }

  // Grouped by completion, not schedule time — a field group's own `repeat`
  // does carry an `hour`/`minute` (see fieldGroupRepeat.ts), but nothing in
  // this app gates on it today (`isFieldGroupActiveOnDay` only ever reads
  // `dayOfWeek`), so most templates would land in a real "Morning" bucket by
  // accident of an unset default rather than a schedule anyone actually set.
  // completedAt is real, always-present data every task already carries.
  const pendingIds = checklistByGivingDateIds.filter(id => !checklist[id]?.completedAt);
  const completedIds = checklistByGivingDateIds.filter(id => checklist[id]?.completedAt);
  const completedPercent = Math.round((completedIds.length / checklistByGivingDateIds.length) * 100);

  const renderTaskRow = (id: string) => {
    const currentChecklist = checklist[id];
    const currentChecklistTemplate =
      checklistTemplate[currentChecklist.checklistTemplateId];
    const completed = Boolean(currentChecklist?.completedAt);
    const color = currentChecklistTemplate?.avatar.color || '#8A8A8A';
    const timeLabel = completed
      ? currentChecklist.completedAt && format(new Date(currentChecklist.completedAt), 'h:mm')
      : getScheduledTimeLabel(currentChecklistTemplate);

    return (
      <div
        key={id}
        className={cx(styles.taskRow, completed && styles.taskRowDone)}
        onClick={() =>
          navigate(
            `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
          )
        }
      >
        <div onClick={e => e.stopPropagation()} className={styles.rowCheckbox}>
          <Checkbox
            defaultChecked={completed}
            className={styles.checkbox}
            style={{ accentColor: color }}
            onChange={event => {
              event.stopPropagation();
              updateChecklist({
                ...currentChecklist,
                completedAt: event.target.checked
                  ? new Date().toISOString()
                  : undefined,
              });
            }}
          />
        </div>
        <span className={styles.rowDot} style={{ background: color }} />
        <div className={styles.rowInfo}>
          <div className={styles.rowTitleLine}>
            <Typography.Text className={styles.rowTitle}>
              {currentChecklist?.title || currentChecklistTemplate?.title}
            </Typography.Text>
            {currentChecklistTemplate?.visibility === 'public' && (
              <span className={styles.publicBadge}>
                {intl.formatMessage({
                  id: 'ChecklistToday.public-badge',
                  defaultMessage: 'Public',
                })}
              </span>
            )}
          </div>
          <Typography.Text className={styles.rowSubtitle}>
            {formatTemplateSchedule(currentChecklistTemplate)}
          </Typography.Text>
        </div>
        {timeLabel && (
          <Typography.Text className={styles.rowTime}>{timeLabel}</Typography.Text>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography.Title level={2} className={styles.dateTitle} noMargin>
          {isToday(date)
            ? intl.formatMessage({ id: 'ChecklistToday.today', defaultMessage: 'Today' })
            : format(date, 'EEEE')}
        </Typography.Title>
        <Typography.Text className={styles.dateSubtitle}>
          {intl.formatMessage(
            {
              id: 'ChecklistToday.date-subtitle',
              defaultMessage: '{{solarDate}} · Lunar day {{day}}, mo {{month}}',
            },
            { solarDate: format(date, 'MMMM d'), day: lunar.day, month: lunar.month },
          )}
        </Typography.Text>
      </div>

      <div className={styles.summaryRow}>
        <Typography.Text className={styles.summaryText}>
          {intl.formatMessage(
            {
              id: 'ChecklistToday.summary',
              defaultMessage: '{{done}} of {{total}} done · {{phrase}}',
            },
            {
              done: completedIds.length,
              total: checklistByGivingDateIds.length,
              phrase: intl.formatMessage(lunarPhrase),
            },
          )}
        </Typography.Text>
        <div className={styles.progressBlock}>
          <Typography.Text className={styles.progressLabel}>
            {intl.formatMessage(
              { id: 'ChecklistToday.done-count', defaultMessage: '{{count}} done' },
              { count: completedIds.length },
            )}
          </Typography.Text>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${completedPercent}%` }} />
          </div>
          <Typography.Text className={styles.progressLabel}>
            {intl.formatMessage(
              { id: 'ChecklistToday.to-go-count', defaultMessage: '{{count}} to go' },
              { count: pendingIds.length },
            )}
          </Typography.Text>
        </div>
      </div>

      <Card className={styles.sectionCard}>
        {pendingIds.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <Typography.Text className={styles.sectionLabel}>
                {intl.formatMessage({ id: 'ChecklistToday.pending', defaultMessage: 'Pending' })}
              </Typography.Text>
              <Typography.Text className={styles.sectionCount}>{pendingIds.length}</Typography.Text>
            </div>
            <div className={styles.itemList}>{pendingIds.map(renderTaskRow)}</div>
          </>
        )}
        <AddInlineTask className={styles.quickAddTask} />
      </Card>

      {completedIds.length > 0 && (
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Typography.Text className={styles.sectionLabel}>
              {intl.formatMessage({
                id: 'ChecklistToday.completed',
                defaultMessage: 'Completed',
              })}
            </Typography.Text>
            <Typography.Text className={styles.sectionCount}>{completedIds.length}</Typography.Text>
          </div>
          <div className={styles.itemList}>{completedIds.map(renderTaskRow)}</div>
        </Card>
      )}
    </div>
  );
};

export default ChecklistTodayDesktop;
