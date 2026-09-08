import React from 'react';
import { useChecklist } from '@dreamer/global';
import { NavigateFunction } from 'react-router-dom';
import { isEditableTarget, getNextFocusId } from './checklistDayHelpers';
import { AddInlineTaskHandle } from '../AddInlineTask';

type Params = {
  orderedIds: string[];
  focusedTaskId: string | null;
  setFocusedTaskId: (id: string | null) => void;
  checklist: ReturnType<typeof useChecklist>['checklist'];
  updateChecklist: ReturnType<typeof useChecklist>['updateChecklist'];
  navigate: NavigateFunction;
  date: Date;
  addTaskRef: React.RefObject<AddInlineTaskHandle>;
  openDeleteFromKeyboard: (id: string, nextFocusId: string | null) => void;
};

// Vim-style list navigation for ChecklistDay.desktop.tsx: j/k to move the focused row, x to
// toggle it done (jumping to the next row after, same as d below), o/Enter to open it, d to delete
// it (see useDeleteTaskFlow.ts), a to jump into "Add a new task...". Ignored whenever an
// input/textarea/contenteditable already has focus, so typing a task name never gets swallowed as
// a shortcut — Escape there just blurs back out instead. Pulled into its own hook to keep the main
// component under the repo's ~200-line-per-file guideline (CLAUDE.md's "Keep every file under ~200
// lines").
export const useChecklistDayShortcuts = ({
  orderedIds,
  focusedTaskId,
  setFocusedTaskId,
  checklist,
  updateChecklist,
  navigate,
  date,
  addTaskRef,
  openDeleteFromKeyboard,
}: Params) => {
  React.useEffect(() => {
    if (focusedTaskId && !orderedIds.includes(focusedTaskId)) {
      setFocusedTaskId(null);
    }
  }, [orderedIds, focusedTaskId, setFocusedTaskId]);

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
          const nextId = getNextFocusId(orderedIds, focusedTaskId);
          updateChecklist({
            ...currentChecklist,
            completedAt: currentChecklist.completedAt ? undefined : new Date().toISOString(),
          });
          setFocusedTaskId(nextId);
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
        case 'd': {
          if (!focusedTaskId || !checklist[focusedTaskId]) return;
          event.preventDefault();
          // Read back once the delete actually resolves (see useDeleteTaskFlow.ts), so pressing
          // 'd' repeatedly walks down the list deleting as it goes, the way `j`/`k` already let
          // you walk it without deleting.
          openDeleteFromKeyboard(focusedTaskId, getNextFocusId(orderedIds, focusedTaskId));
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
  }, [orderedIds, focusedTaskId, checklist, updateChecklist, navigate, date, openDeleteFromKeyboard, addTaskRef, setFocusedTaskId]);
};
