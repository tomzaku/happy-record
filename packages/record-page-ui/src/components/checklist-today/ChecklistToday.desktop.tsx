import React from 'react';
import {
  useChecklist,
  useChecklistTemplates,
  useFieldGroups,
  ChecklistTemplate,
  getEffectiveDayOfWeek,
  formatDaysOfWeek,
  getActiveFieldGroups,
  isRecurringSchedule,
  ALL_ICAL_DAYS,
} from '@dreamer/global';
import { Icon } from '@moon-ui/icon/Icon';
import Checkbox from '@moon-ui/checkbox';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './ChecklistToday.desktop.module.scss';
import cx from 'classnames';
import Typography from '@moon-ui/typography';
import { useNavigate } from 'react-router-dom';
import { useIntl } from '@dreamer/translation';
import Card from '@moon-ui/card';
import { format, isToday, subDays, endOfDay } from 'date-fns';
import AddInlineTask, { AddInlineTaskHandle, PendingInlineTask } from '../AddInlineTask';
import { getLunarDate } from '../../utils/lunarDate';
import EmptyChecklistIllustration from './EmptyChecklistIllustration';
import DeleteTaskModal from './DeleteTaskModal';

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
    return formatDaysOfWeek(getEffectiveDayOfWeek(template) ?? ALL_ICAL_DAYS);
  }

  if (!template.repeat?.byday) return 'No schedule';
  const time = `${template.repeat.byhour.padStart(2, '0')}:${template.repeat.byminute.padStart(2, '0')}`;
  return `${time} • ${formatDaysOfWeek(template.repeat.byday)}`;
};

// The row's own right-aligned time — only meaningful for a template with no
// field groups (see formatTemplateSchedule's own comment on why a merged
// per-group schedule has no single time to show).
const getScheduledTimeLabel = (template?: ChecklistTemplate): string | undefined => {
  if (!template?.repeat?.byhour || getActiveFieldGroups(template.fieldGroups ?? []).length > 0) {
    return undefined;
  }
  return format(new Date(0, 0, 0, Number(template.repeat.byhour), Number(template.repeat.byminute)), 'h:mm');
};

const ChecklistTodayDesktop = ({
  date,
  selectedTag,
}: {
  date: Date;
  selectedTag?: string;
}) => {
  const { getChecklistByGivingDate, updateChecklist, deleteChecklist, getAllChecklistWithTemplate, checklistsLoading } =
    useChecklist();
  const {
    checklistTemplate,
    templatesLoading,
    isOwnedTemplate,
    deleteChecklistTemplate,
    updateChecklistTemplate,
    deleteOccurrence,
  } = useChecklistTemplates();
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

  // Grouped by completion, not schedule time — a field group's own `repeat`
  // does carry a `byhour`/`byminute` (see fieldGroupRepeat.ts), but nothing in
  // this app gates on it today (`isFieldGroupActiveOnDay` only ever reads
  // `byday`), so most templates would land in a real "Morning" bucket by
  // accident of an unset default rather than a schedule anyone actually set.
  // completedAt is real, always-present data every task already carries.
  // Computed above the loading/empty early returns (rather than alongside
  // the render below, where they used to live) purely so the keyboard-nav
  // hooks right after can depend on `orderedIds` without breaking the rules
  // of hooks, and so `header` below (shown on every branch) can already show
  // real progress instead of waiting for the full-list branch.
  const pendingIds = React.useMemo(
    () => checklistByGivingDateIds.filter(id => !checklist[id]?.completedAt),
    [checklistByGivingDateIds, checklist],
  );
  const completedIds = React.useMemo(
    () => checklistByGivingDateIds.filter(id => checklist[id]?.completedAt),
    [checklistByGivingDateIds, checklist],
  );
  const orderedIds = React.useMemo(() => [...pendingIds, ...completedIds], [pendingIds, completedIds]);

  const completedPercent =
    checklistByGivingDateIds.length > 0
      ? Math.round((completedIds.length / checklistByGivingDateIds.length) * 100)
      : 0;

  // Depends only on `date`/`lunar`/completion counts — never on the templates/checklists fetch
  // itself — so it renders the same on every branch below (loading, empty, and the full list)
  // instead of waiting on the network like the rest of the page does.
  const header = (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
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
  );

  // Vim-style list navigation: j/k to move the focused row, x to toggle it
  // done, o/Enter to open it, a to jump into "Add a new task...". Ignored
  // whenever an input/textarea/contenteditable already has focus, so typing
  // a task name never gets swallowed as a shortcut — Escape there just blurs
  // back out instead.
  const [focusedTaskId, setFocusedTaskId] = React.useState<string | null>(null);
  // Which row the cursor is over, driving the shared-`layoutId` background below —
  // that's what makes it glide from one row to the next instead of each row
  // fading in/out independently.
  const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null);
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

  // The row's own hover-revealed delete icon — mirrors the edit-title state shape above (the
  // Checklist instance's own id, not the template's). `deletingTaskId` gates which task the
  // confirm modal (DeleteTaskModal) is currently open for.
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);

  const cancelDeleteTask = () => setDeletingTaskId(null);

  // "This event" — Google Calendar's own EXDATE: skip just this one calendar day, leaving the
  // rest of the series untouched. The exception alone is enough to hide it — `occursOnDate`
  // (rruleUtils.ts) checks `exceptionDates` before either matching branch, so this day's own
  // template id never even reaches `scheduledChecklists`'/`nonScheduledChecklists`' own lookups
  // again once the invalidated query refetches. Also removes the local row when one was already
  // materialized (not `clientOnly`) — not required for correctness, just hygiene, same as
  // `handleDeleteAll` below already does for the whole series.
  const handleDeleteToday = () => {
    if (!deletingTaskId) return;
    const currentChecklist = checklist[deletingTaskId];
    setDeletingTaskId(null);
    // The row about to animate out is very likely also the currently-hovered one (its own delete
    // button is what opened this modal) — clearing this first keeps the shared `layoutId`
    // hover-glide (see renderTaskRow's own `taskHoverBg`) from re-mounting onto whatever row the
    // cursor ends up over once the list reflows, which reads as the highlight (and, at a glance,
    // "the task") flying across the list mid-delete.
    setHoveredTaskId(null);
    if (!currentChecklist) return;
    deleteOccurrence(currentChecklist.checklistTemplateId, format(date, 'yyyy-MM-dd'));
    if (!currentChecklist.clientOnly) deleteChecklist(deletingTaskId);
  };

  // "This and following events" — the series just ends the day before this one; no split needed
  // (that's only for *editing* a different pattern from here on — see ChecklistGenericInfo's own
  // handleSaveSchedule). Reuses the existing updateChecklistTemplate mutation exactly.
  const handleDeleteThisAndFollowing = () => {
    if (!deletingTaskId) return;
    const currentChecklist = checklist[deletingTaskId];
    setDeletingTaskId(null);
    setHoveredTaskId(null);
    if (!currentChecklist) return;
    const template = checklistTemplate[currentChecklist.checklistTemplateId];
    if (!template) return;
    updateChecklistTemplate({
      ...template,
      repeat: { ...template.repeat, until: endOfDay(subDays(date, 1)).toISOString() },
    });
  };

  // Deleting the template alone doesn't remove instances already materialized into real rows
  // (server-side `checklist-templates` delete doesn't cascade — see EditChecklistForm.tsx's own
  // two-call delete, which this mirrors exactly): the template itself, then every instance it
  // already has, fetched fresh rather than trusting whatever's in the store for other dates.
  const handleDeleteAll = async () => {
    if (!deletingTaskId) return;
    const currentChecklist = checklist[deletingTaskId];
    setDeletingTaskId(null);
    setHoveredTaskId(null);
    if (!currentChecklist) return;
    const { checklistTemplateId } = currentChecklist;
    deleteChecklistTemplate(checklistTemplateId);
    // The row the user actually clicked delete on goes first, synchronously — this is the row
    // `DeleteTaskModal`'s exit animation is playing, and it's also *this app's* only instance for
    // the overwhelmingly common case (a one-off task with a single Checklist row). Waiting on
    // `getAllChecklistWithTemplate`'s real network round-trip before removing it at all (the
    // previous shape here) left it sitting on screen — template already gone, so rendering with
    // fallback icon/schedule — for however long that fetch took, then removing it as part of a
    // batch alongside whatever else came back; by then enough had re-rendered in between that its
    // exit animation no longer matched where it visually was, reading as a jump to the end of the
    // list instead of a clean fade-out in place. Every *other* already-materialized instance
    // (other days, for a task with more than the one row) still gets cleaned up right after, just
    // not gating this row's own removal on it.
    deleteChecklist(deletingTaskId);
    const instances = await getAllChecklistWithTemplate(checklistTemplateId);
    instances.forEach(instance => {
      if (instance.id !== deletingTaskId) deleteChecklist(instance.id);
    });
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

  // Plain, unanimated — deliberately not a `motion.div` inside the `AnimatePresence` below. This
  // placeholder's whole point is to bridge a gap that's normally imperceptibly short (the real
  // optimistic checklist row typically lands within the very next render); giving it its own
  // exit animation made that gap last a full transition's worth of time instead, during which
  // both this placeholder and the real row it's handing off to were visibly on screen at once —
  // read as a duplicated/empty row. `AnimatePresence` only special-cases children that declare
  // exit variants, so a plain element among its `motion.div` siblings just unmounts immediately,
  // same as before any of this animation existed.
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
      fieldGroups: getFieldGroups(rawTemplate.id, isOwnedTemplate(rawTemplate.id)),
    };
    const completed = Boolean(currentChecklist?.completedAt);
    const color = currentChecklistTemplate?.avatar.color || '#8A8A8A';
    const timeLabel = completed
      ? currentChecklist.completedAt && format(new Date(currentChecklist.completedAt), 'h:mm')
      : getScheduledTimeLabel(currentChecklistTemplate);
    const title = currentChecklist?.title || currentChecklistTemplate?.title || '';
    const isEditingTitle = editingTaskId === id;
    // Set only on the local optimistic copy (addChecklistTemplate) until the real row lands —
    // see checklistTemplateTypes.ts's own `isClient`. The row already renders (the optimistic
    // write already made it real enough to show), so this only swaps its checkbox/subtitle for a
    // "Creating…" status rather than hiding it.
    const isCreating = Boolean(currentChecklistTemplate?.isClient);

    return (
      <motion.div
        key={id}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cx(
          styles.taskRow,
          completed && styles.taskRowDone,
          id === focusedTaskId && styles.taskRowFocused,
          isCreating && styles.taskRowPending,
        )}
        onClick={() => {
          if (isCreating) return;
          setFocusedTaskId(id);
          navigate(
            `/task/${currentChecklist.checklistTemplateId}?currentDay=${date.toISOString()}${currentChecklist.clientOnly ? '' : `&checklistId=${currentChecklist.id}`}`,
          );
        }}
        onMouseEnter={() => setHoveredTaskId(id)}
        onMouseLeave={() => setHoveredTaskId(current => (current === id ? null : current))}
      >
        {id === hoveredTaskId && (
          <motion.div
            className={styles.taskHoverBg}
            layoutId="taskHoverBg"
            transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.5 }}
          />
        )}
        <div onClick={e => e.stopPropagation()} className={styles.rowCheckbox}>
          {isCreating ? (
            <Icon width={20} icon="svg-spinners:180-ring" />
          ) : (
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
          )}
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
                <button
                  type="button"
                  className={styles.rowDeleteButton}
                  onClick={event => {
                    event.stopPropagation();
                    setDeletingTaskId(id);
                  }}
                  aria-label={intl.formatMessage({
                    id: 'ChecklistToday.delete-task-label',
                    defaultMessage: 'Delete task',
                  })}
                >
                  <Icon width={14} icon="solar:trash-bin-minimalistic-2-line-duotone" />
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
            {isCreating
              ? intl.formatMessage({ id: 'ChecklistToday.creating', defaultMessage: 'Creating…' })
              : formatTemplateSchedule(currentChecklistTemplate)}
          </Typography.Text>
        </div>
        {timeLabel && (
          <Typography.Text className={styles.rowTime}>{timeLabel}</Typography.Text>
        )}
      </motion.div>
    );
  };

  const deletingChecklist = deletingTaskId ? checklist[deletingTaskId] : undefined;
  const deletingTemplate = deletingChecklist && checklistTemplate[deletingChecklist.checklistTemplateId];
  const deletingTaskTitle = deletingChecklist?.title || deletingTemplate?.title || '';

  return (
    <div className={styles.container}>
      {header}

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
              {/* `pendingTasks` (the transient "Creating…" placeholder) stays outside this
                  `AnimatePresence` on purpose — it's a plain, untracked element (see
                  `renderPendingTaskRow`'s own comment), and mixing an untracked child in with the
                  `motion.div` rows `AnimatePresence` *is* tracking confuses its own bookkeeping of
                  which index each exiting row should reappear at. */}
              <AnimatePresence initial={false}>{pendingIds.map(renderTaskRow)}</AnimatePresence>
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
          <div className={styles.itemList}>
            <AnimatePresence initial={false}>{completedIds.map(renderTaskRow)}</AnimatePresence>
          </div>
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

      <DeleteTaskModal
        visible={!!deletingTaskId}
        taskTitle={deletingTaskTitle}
        isRecurring={isRecurringSchedule(deletingTemplate?.repeat)}
        onCancel={cancelDeleteTask}
        onDeleteToday={handleDeleteToday}
        onDeleteThisAndFollowing={handleDeleteThisAndFollowing}
        onDeleteAll={handleDeleteAll}
      />
    </div>
  );
};

export default ChecklistTodayDesktop;
