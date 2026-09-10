import React from 'react';
import { endOfDay, subDays } from 'date-fns';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';

type Params = {
  date: Date;
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  deleteChecklist: ReturnType<typeof useChecklist>['deleteChecklist'];
  getAllChecklistWithTemplate: ReturnType<typeof useChecklist>['getAllChecklistWithTemplate'];
  deleteChecklistTemplate: ReturnType<typeof useChecklistTemplates>['deleteChecklistTemplate'];
  updateChecklistTemplate: ReturnType<typeof useChecklistTemplates>['updateChecklistTemplate'];
  deleteOccurrence: ReturnType<typeof useChecklistTemplates>['deleteOccurrence'];
  setHoveredTaskId: (id: string | null) => void;
  setFocusedTaskId: (id: string | null) => void;
};

// The row's own hover-revealed delete icon and the 'd' keyboard shortcut (ChecklistDay.desktop.tsx)
// both open through here — pulled into its own hook to keep that file under the repo's
// ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200 lines"). Also owns the
// keyboard-vs-mouse bookkeeping for "which row should take focus once this delete resolves" (see
// getNextFocusId in checklistDayHelpers.ts): a keyboard-triggered delete (openDeleteFromKeyboard)
// restores focus to the row computed when 'd' was pressed; the row's own mouse-driven delete icon
// (openDelete) has no focused row to return to, so it leaves focus untouched.
export const useDeleteTaskFlow = ({
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
}: Params) => {
  const [deletingTaskId, setDeletingTaskId] = React.useState<string | null>(null);
  const nextFocusAfterDeleteRef = React.useRef<string | null>(null);
  const isKeyboardDeleteRef = React.useRef(false);

  const openDelete = React.useCallback((id: string) => setDeletingTaskId(id), []);
  const openDeleteFromKeyboard = React.useCallback((id: string, nextFocusId: string | null) => {
    nextFocusAfterDeleteRef.current = nextFocusId;
    isKeyboardDeleteRef.current = true;
    setDeletingTaskId(id);
  }, []);
  const cancelDelete = React.useCallback(() => {
    setDeletingTaskId(null);
    isKeyboardDeleteRef.current = false;
  }, []);

  // Common teardown every scope handler below starts with: close the modal, clear the shared
  // hover highlight (see ChecklistDayRow's own `taskHoverBg` comment — the row about to animate
  // out is very likely also the currently-hovered one), and — only for a keyboard-triggered delete
  // — restore focus to the row computed when 'd' was pressed.
  const finishDelete = () => {
    setDeletingTaskId(null);
    setHoveredTaskId(null);
    if (isKeyboardDeleteRef.current) {
      isKeyboardDeleteRef.current = false;
      setFocusedTaskId(nextFocusAfterDeleteRef.current);
    }
  };

  // "This event" — Google Calendar's own EXDATE: skip just this one occurrence, leaving the rest
  // of the series untouched. The exception alone is enough to hide it — `occursOnDate`
  // (rruleUtils.ts) checks `exceptionDates` before either matching branch, so this day's own
  // template id never even reaches `scheduledChecklists`'/`nonScheduledChecklists`' own lookups
  // again once the invalidated query refetches. `currentChecklist.startedAt` (not `date`/`format`)
  // is what actually identifies the occurrence server-side now — a plain calendar day can't tell
  // two same-day occurrences of a schedule apart (see the `schedule_exceptions` table's own
  // migration) — a `clientOnly` placeholder's own `startedAt` is still a deterministic stand-in
  // for the same real moment, so this works identically whether or not today's row has actually
  // been materialized yet. Also removes the local row when one was already materialized (not
  // `clientOnly`) — not required for correctness, just hygiene, same as `handleDeleteAll` below
  // already does for the whole series.
  const handleDeleteToday = () => {
    if (!deletingTaskId) return;
    const currentChecklist = checklist[deletingTaskId];
    finishDelete();
    if (!currentChecklist) return;
    deleteOccurrence(currentChecklist.checklistTemplateId, currentChecklist.startedAt);
    if (!currentChecklist.clientOnly) deleteChecklist(deletingTaskId);
  };

  // "This and following events" — the series just ends the day before this one; no split needed
  // (that's only for *editing* a different pattern from here on — see ChecklistGenericInfo's own
  // handleSaveSchedule). Reuses the existing updateChecklistTemplate mutation exactly.
  const handleDeleteThisAndFollowing = () => {
    if (!deletingTaskId) return;
    const currentChecklist = checklist[deletingTaskId];
    finishDelete();
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
    finishDelete();
    if (!currentChecklist) return;
    const { checklistTemplateId } = currentChecklist;
    deleteChecklistTemplate(checklistTemplateId);
    // The row the user actually clicked delete on goes first, synchronously — this is the row
    // `DeleteTaskModal`'s exit animation is playing, and it's also *this app's* only instance for
    // the overwhelmingly common case (a one-off task with a single Checklist row). Waiting on
    // `getAllChecklistWithTemplate`'s real network round-trip before removing it at all left it
    // sitting on screen — template already gone, so rendering with fallback icon/schedule — for
    // however long that fetch took. Every *other* already-materialized instance (other days, for a
    // task with more than the one row) still gets cleaned up right after, just not gating this
    // row's own removal on it.
    deleteChecklist(deletingTaskId);
    const instances = await getAllChecklistWithTemplate(checklistTemplateId);
    instances.forEach(instance => {
      if (instance.id !== deletingTaskId) deleteChecklist(instance.id);
    });
  };

  const deletingChecklist = deletingTaskId ? checklist[deletingTaskId] : undefined;
  const deletingTemplate = deletingChecklist && checklistTemplate[deletingChecklist.checklistTemplateId];
  const deletingTaskTitle = deletingChecklist?.title || deletingTemplate?.title || '';

  return {
    deletingTaskId,
    deletingTemplate,
    deletingTaskTitle,
    openDelete,
    openDeleteFromKeyboard,
    cancelDelete,
    handleDeleteToday,
    handleDeleteThisAndFollowing,
    handleDeleteAll,
  };
};
