import React from 'react';
import { useChecklist, useChecklistTemplates, isRecurringSchedule } from '@dreamer/global';
import styles from './ChecklistDay.desktop.module.scss';
import { useNavigate } from 'react-router-dom';
import { AddInlineTaskHandle, PendingInlineTask } from '../AddInlineTask';
import { getLunarDate } from '../../utils/lunarDate';
import DeleteTaskModal from './DeleteTaskModal';
import ChecklistDayHeader from './ChecklistDayHeader';
import ChecklistDayLoadingState from './ChecklistDayLoadingState';
import ChecklistDayEmptyState from './ChecklistDayEmptyState';
import ChecklistDayShortcutsHint from './ChecklistDayShortcutsHint';
import ChecklistDayRow from './ChecklistDayRow';
import ChecklistDayTaskList from './ChecklistDayTaskList';
import { useDeleteTaskFlow } from './useDeleteTaskFlow';
import { useChecklistDayShortcuts } from './useChecklistDayShortcuts';
import { useInlineTaskTitleEdit } from './useInlineTaskTitleEdit';

const ChecklistDayDesktop = ({
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
    deleteChecklistTemplate,
    updateChecklistTemplate,
    deleteOccurrence,
  } = useChecklistTemplates();
  const navigate = useNavigate();

  // `getChecklistByGivingDate` is itself a `useCallback` chain rooted in
  // `checklist`/`checklistTemplate`/`selectedChecklistTemplates` (see useChecklists.tsx), so
  // depending on the function directly here — not hand-picking which underlying pieces "should"
  // matter — is what makes this recompute on every relevant change, `selectedChecklistTemplates`
  // included.
  const { checklist, checklistIds: checklistByGivingDateIds } = React.useMemo(
    () => getChecklistByGivingDate({ date, selectedTag }),
    [getChecklistByGivingDate, date, selectedTag],
  );

  const lunar = React.useMemo(() => getLunarDate(date), [date]);

  // Grouped by completion, not schedule time — see git history for why. Computed above the
  // loading/empty early returns (rather than alongside the render below, where they used to live)
  // purely so the keyboard-shortcut hook right after can depend on `orderedIds` without breaking
  // the rules of hooks, and so `header` below (shown on every branch) can already show real
  // progress instead of waiting for the full-list branch.
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

  const header = (
    <ChecklistDayHeader
      date={date}
      lunar={lunar}
      completedCount={completedIds.length}
      pendingCount={pendingIds.length}
      completedPercent={completedPercent}
    />
  );

  const [focusedTaskId, setFocusedTaskId] = React.useState<string | null>(null);
  // Which row the cursor is over, driving the shared-`layoutId` background in ChecklistDayRow —
  // that's what makes it glide from one row to the next instead of each row fading in/out
  // independently.
  const [hoveredTaskId, setHoveredTaskId] = React.useState<string | null>(null);
  const addTaskRef = React.useRef<AddInlineTaskHandle>(null);

  const {
    editingTaskId,
    editingTitleValue,
    setEditingTitleValue,
    startEditingTitle,
    cancelEditingTitle,
    commitEditingTitle,
  } = useInlineTaskTitleEdit({ checklist, checklistTemplate, updateChecklist });

  const {
    deletingTaskId,
    deletingTemplate,
    deletingTaskTitle,
    openDelete,
    openDeleteFromKeyboard,
    cancelDelete,
    handleDeleteToday,
    handleDeleteThisAndFollowing,
    handleDeleteAll,
  } = useDeleteTaskFlow({
    date,
    checklist,
    checklistTemplate,
    deleteChecklist,
    getAllChecklistWithTemplate,
    deleteChecklistTemplate,
    updateChecklistTemplate,
    deleteOccurrence,
    setHoveredTaskId,
    setFocusedTaskId,
  });

  // Optimistic placeholders for tasks that are still saving — see
  // AddInlineTask's own comment on why creating a task's real Checklist row
  // can't appear until its template's own POST resolves. Not part of
  // `orderedIds`/keyboard nav: there's nothing to open or toggle yet.
  const [pendingTasks, setPendingTasks] = React.useState<PendingInlineTask[]>([]);
  const handleTaskCreateStart = React.useCallback((task: PendingInlineTask) => {
    setPendingTasks(prev => [...prev, task]);
  }, []);
  const handleTaskCreateEnd = React.useCallback((id: string) => {
    setPendingTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  useChecklistDayShortcuts({
    orderedIds,
    focusedTaskId,
    setFocusedTaskId,
    checklist,
    updateChecklist,
    navigate,
    date,
    addTaskRef,
    openDeleteFromKeyboard,
  });

  // `checklistByGivingDateIds` is empty both while the templates/checklists
  // fetch is still in flight and once it's genuinely resolved with nothing —
  // indistinguishable without these flags. Showing "No tasks found!" during
  // the former flashes a wrong, momentary answer on every fresh page load.
  if ((templatesLoading || checklistsLoading) && checklistByGivingDateIds.length === 0) {
    return (
      <>
        {header}
        <ChecklistDayLoadingState />
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
        <ChecklistDayEmptyState
          date={date}
          addTaskRef={addTaskRef}
          onTaskCreateStart={handleTaskCreateStart}
          onTaskCreateEnd={handleTaskCreateEnd}
        />
      </>
    );
  }

  const renderTaskRow = (id: string) => (
    <ChecklistDayRow
      key={id}
      id={id}
      date={date}
      checklist={checklist}
      checklistTemplate={checklistTemplate}
      focusedTaskId={focusedTaskId}
      hoveredTaskId={hoveredTaskId}
      setFocusedTaskId={setFocusedTaskId}
      setHoveredTaskId={setHoveredTaskId}
      updateChecklist={updateChecklist}
      navigate={navigate}
      editingTaskId={editingTaskId}
      editingTitleValue={editingTitleValue}
      setEditingTitleValue={setEditingTitleValue}
      startEditingTitle={startEditingTitle}
      commitEditingTitle={commitEditingTitle}
      cancelEditingTitle={cancelEditingTitle}
      openDelete={openDelete}
    />
  );

  return (
    <div className={styles.container}>
      {header}

      <ChecklistDayTaskList
        date={date}
        pendingIds={pendingIds}
        completedIds={completedIds}
        pendingTasks={pendingTasks}
        renderTaskRow={renderTaskRow}
        addTaskRef={addTaskRef}
        onTaskCreateStart={handleTaskCreateStart}
        onTaskCreateEnd={handleTaskCreateEnd}
      />

      <ChecklistDayShortcutsHint />

      <DeleteTaskModal
        visible={!!deletingTaskId}
        taskTitle={deletingTaskTitle}
        isRecurring={isRecurringSchedule(deletingTemplate?.repeat)}
        onCancel={cancelDelete}
        onDeleteToday={handleDeleteToday}
        onDeleteThisAndFollowing={handleDeleteThisAndFollowing}
        onDeleteAll={handleDeleteAll}
      />
    </div>
  );
};

export default ChecklistDayDesktop;
