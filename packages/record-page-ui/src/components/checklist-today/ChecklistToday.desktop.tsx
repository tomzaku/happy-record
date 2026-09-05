import React from 'react';
import {
  useChecklist,
  useChecklistTemplates,
  useFieldGroups,
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
import AddInlineTask, { AddInlineTaskHandle, PendingInlineTask } from '../AddInlineTask';
import { getLunarDate, getLunarPhraseId } from '../../utils/lunarDate';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
};

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
  const { getFieldGroups } = useFieldGroups();
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

  // Depends only on `date`/`lunar` — never on the templates/checklists fetch — so it renders
  // the same on every branch below (loading, empty, and the full list) instead of waiting on
  // the network like the rest of the page does.
  const header = (
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
  );

  // Grouped by completion, not schedule time — a field group's own `repeat`
  // does carry an `hour`/`minute` (see fieldGroupRepeat.ts), but nothing in
  // this app gates on it today (`isFieldGroupActiveOnDay` only ever reads
  // `dayOfWeek`), so most templates would land in a real "Morning" bucket by
  // accident of an unset default rather than a schedule anyone actually set.
  // completedAt is real, always-present data every task already carries.
  // Computed above the loading/empty early returns (rather than alongside
  // the render below, where they used to live) purely so the keyboard-nav
  // hooks right after can depend on `orderedIds` without breaking the rules
  // of hooks.
  const pendingIds = React.useMemo(
    () => checklistByGivingDateIds.filter(id => !checklist[id]?.completedAt),
    [checklistByGivingDateIds, checklist],
  );
  const completedIds = React.useMemo(
    () => checklistByGivingDateIds.filter(id => checklist[id]?.completedAt),
    [checklistByGivingDateIds, checklist],
  );
  const orderedIds = React.useMemo(() => [...pendingIds, ...completedIds], [pendingIds, completedIds]);

  // Vim-style list navigation: j/k to move the focused row, x to toggle it
  // done, o/Enter to open it, a to jump into "Add a new task...". Ignored
  // whenever an input/textarea/contenteditable already has focus, so typing
  // a task name never gets swallowed as a shortcut — Escape there just blurs
  // back out instead.
  const [focusedTaskId, setFocusedTaskId] = React.useState<string | null>(null);
  const addTaskRef = React.useRef<AddInlineTaskHandle>(null);

  // Inline rename — the row's own edit icon (shown on hover) swaps the title
  // for a plain input instead of routing through the full task detail page
  // for a one-word fix. Writes to the Checklist instance's own `title`
  // (already what the row falls back from — see renderTaskRow), not the
  // template's, mirroring how `completedAt` is already a per-instance
  // override rather than a template-level edit.
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = React.useState('');

  const startEditingTitle = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setEditingTitleValue(currentTitle);
  };

  const cancelEditingTitle = () => {
    setEditingTaskId(null);
  };

  const commitEditingTitle = () => {
    if (!editingTaskId) return;
    const currentChecklist = checklist[editingTaskId];
    const trimmed = editingTitleValue.trim();
    const previousTitle =
      currentChecklist?.title || checklistTemplate[currentChecklist?.checklistTemplateId]?.title;
    if (currentChecklist && trimmed && trimmed !== previousTitle) {
      updateChecklist({ ...currentChecklist, title: trimmed });
    }
    setEditingTaskId(null);
  };

  // Optimistic placeholders for tasks that are still saving — see
  // AddInlineTask's own comment on why creating a task's real Checklist row
  // can't appear until its template's own POST resolves. Not part of
  // `orderedIds`/keyboard nav below: there's nothing to open or toggle yet.
  const [pendingTasks, setPendingTasks] = React.useState<PendingInlineTask[]>([]);
  const handleTaskCreateStart = React.useCallback((task: PendingInlineTask) => {
    setPendingTasks(prev => [...prev, task]);
  }, []);
  const handleTaskCreateEnd = React.useCallback((id: string) => {
    setPendingTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  React.useEffect(() => {
    if (focusedTaskId && !orderedIds.includes(focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [orderedIds, focusedTaskId]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (isEditableTarget(event.target)) {
        if (event.key === 'Escape') {
          (event.target as HTMLElement).blur();
        }
        return;
      }

      switch (event.key) {
        case 'j':
        case 'ArrowDown': {
          if (orderedIds.length === 0) return;
          event.preventDefault();
          const currentIndex = focusedTaskId ? orderedIds.indexOf(focusedTaskId) : -1;
          setFocusedTaskId(orderedIds[Math.min(currentIndex + 1, orderedIds.length - 1)]);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          if (orderedIds.length === 0) return;
          event.preventDefault();
          const currentIndex = focusedTaskId ? orderedIds.indexOf(focusedTaskId) : 0;
          setFocusedTaskId(orderedIds[Math.max(currentIndex - 1, 0)]);
          break;
        }
        case 'x': {
          if (!focusedTaskId || !checklist[focusedTaskId]) return;
          event.preventDefault();
          const currentChecklist = checklist[focusedTaskId];
          updateChecklist({
            ...currentChecklist,
            completedAt: currentChecklist.completedAt ? undefined : new Date().toISOString(),
          });
          break;
        }
        case 'o':
        case 'l':
        case 'Enter': {
          if (!focusedTaskId || !checklist[focusedTaskId]) return;
          event.preventDefault();
          const currentChecklist = checklist[focusedTaskId];
          navigate(
            `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
          );
          break;
        }
        case 'h': {
          event.preventDefault();
          navigate(-1);
          break;
        }
        case 'a': {
          event.preventDefault();
          addTaskRef.current?.focus();
          break;
        }
        case 'Escape': {
          setFocusedTaskId(null);
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderedIds, focusedTaskId, checklist, updateChecklist, navigate, date]);

  // `checklistByGivingDateIds` is empty both while the templates/checklists
  // fetch is still in flight and once it's genuinely resolved with nothing —
  // indistinguishable without these flags. Showing "No tasks found!" during
  // the former flashes a wrong, momentary answer on every fresh page load.
  if ((templatesLoading || checklistsLoading) && checklistByGivingDateIds.length === 0) {
    return (
      <>
        {header}
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
      </>
    );
  }

  // A pending optimistic task still counts as "something to show" even
  // before any real Checklist row exists — falls through to the full list
  // below instead of the empty state, so the "Creating…" placeholder has
  // somewhere to render.
  if (checklistByGivingDateIds.length === 0 && pendingTasks.length === 0) {
    return (
<>
      {header}
      <div className={styles.emptyContainer}>
        <div className={styles.emptyBody}>
          <EmptyChecklistIllustration />
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
        <AddInlineTask
          ref={addTaskRef}
          date={date}
          className={styles.quickAddTask}
          onTaskCreateStart={handleTaskCreateStart}
          onTaskCreateEnd={handleTaskCreateEnd}
        />
      </div>
        <div className={styles.shortcutsHint}>
          <span className={styles.shortcutItem}>
            <kbd className={styles.kbd}>a</kbd>
            {intl.formatMessage({ id: 'ChecklistToday.shortcuts-add', defaultMessage: 'Add task' })}
          </span>
        </div>
</>
    );
  }

  const completedPercent =
    checklistByGivingDateIds.length > 0
      ? Math.round((completedIds.length / checklistByGivingDateIds.length) * 100)
      : 0;

  const renderPendingTaskRow = (task: PendingInlineTask) => (
    <div key={task.id} className={cx(styles.taskRow, styles.taskRowPending)}>
      <div className={styles.rowCheckbox}>
        <Icon width={20} icon="svg-spinners:180-ring" />
      </div>
      <Icon className={styles.rowIcon} width={20} height={20} color="#8A8A8A" icon="solar:settings-linear" />
      <div className={styles.rowInfo}>
        <Typography.Text className={styles.rowTitle}>{task.title}</Typography.Text>
        <Typography.Text className={styles.rowSubtitle}>
          {intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })}
        </Typography.Text>
      </div>
    </div>
  );

  const renderTaskRow = (id: string) => {
    const currentChecklist = checklist[id];
    const rawTemplate = checklistTemplate[currentChecklist.checklistTemplateId];
    // `fieldGroups` isn't a column on the template row anymore (see useFieldGroups.tsx) —
    // `checklistTemplate[id]` alone never carries it, so this merges in the real, current groups
    // directly rather than trusting a stale (or perpetually empty) copy.
    const currentChecklistTemplate = rawTemplate && {
      ...rawTemplate,
      fieldGroups: getFieldGroups(rawTemplate.id),
    };
    const completed = Boolean(currentChecklist?.completedAt);
    const color = currentChecklistTemplate?.avatar.color || '#8A8A8A';
    const timeLabel = completed
      ? currentChecklist.completedAt && format(new Date(currentChecklist.completedAt), 'h:mm')
      : getScheduledTimeLabel(currentChecklistTemplate);
    const title = currentChecklist?.title || currentChecklistTemplate?.title || '';
    const isEditingTitle = editingTaskId === id;

    return (
      <div
        key={id}
        className={cx(
          styles.taskRow,
          completed && styles.taskRowDone,
          id === focusedTaskId && styles.taskRowFocused,
        )}
        onClick={() => {
          setFocusedTaskId(id);
          navigate(
            `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
          );
        }}
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
        <Icon
          className={styles.rowIcon}
          width={20}
          height={20}
          color={color}
          icon={currentChecklistTemplate?.avatar.name || 'solar:settings-linear'}
        />
        <div className={styles.rowInfo}>
          <div className={styles.rowTitleLine}>
            {isEditingTitle ? (
              <input
                autoFocus
                className={styles.rowTitleInput}
                value={editingTitleValue}
                onClick={event => event.stopPropagation()}
                onChange={event => setEditingTitleValue(event.target.value)}
                onBlur={commitEditingTitle}
                onKeyDown={event => {
                  event.stopPropagation();
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitEditingTitle();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelEditingTitle();
                  }
                }}
              />
            ) : (
              <>
                <Typography.Text className={styles.rowTitle}>{title}</Typography.Text>
                <button
                  type="button"
                  className={styles.rowEditButton}
                  onClick={event => {
                    event.stopPropagation();
                    startEditingTitle(id, title);
                  }}
                  aria-label={intl.formatMessage({
                    id: 'ChecklistToday.edit-title',
                    defaultMessage: 'Edit title',
                  })}
                >
                  <Icon width={14} icon="solar:pen-2-line-duotone" />
                </button>
                {currentChecklistTemplate?.visibility === 'public' && (
                  <span className={styles.publicBadge}>
                    {intl.formatMessage({
                      id: 'ChecklistToday.public-badge',
                      defaultMessage: 'Public',
                    })}
                  </span>
                )}
              </>
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
      {header}

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
        {(pendingIds.length > 0 || pendingTasks.length > 0) && (
          <>
            <div className={styles.sectionHeader}>
              <Typography.Text className={styles.sectionLabel}>
                {intl.formatMessage({ id: 'ChecklistToday.pending', defaultMessage: 'Pending' })}
              </Typography.Text>
              <Typography.Text className={styles.sectionCount}>
                {pendingIds.length + pendingTasks.length}
              </Typography.Text>
            </div>
            <div className={styles.itemList}>
              {pendingIds.map(renderTaskRow)}
              {pendingTasks.map(renderPendingTaskRow)}
            </div>
          </>
        )}
        <AddInlineTask
          ref={addTaskRef}
          date={date}
          className={styles.quickAddTask}
          onTaskCreateStart={handleTaskCreateStart}
          onTaskCreateEnd={handleTaskCreateEnd}
        />
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

      <div className={styles.shortcutsHint}>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>j</kbd>
          <kbd className={styles.kbd}>k</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-navigate', defaultMessage: 'Navigate' })}
        </span>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>l</kbd>
          <kbd className={styles.kbd}>o</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-open', defaultMessage: 'Open' })}
        </span>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>x</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-toggle', defaultMessage: 'Toggle done' })}
        </span>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>a</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-add', defaultMessage: 'Add task' })}
        </span>
        <span className={styles.shortcutItem}>
          <kbd className={styles.kbd}>esc</kbd>
          {intl.formatMessage({ id: 'ChecklistToday.shortcuts-clear', defaultMessage: 'Clear focus' })}
        </span>
      </div>
    </div>
  );
};

export default ChecklistTodayDesktop;
