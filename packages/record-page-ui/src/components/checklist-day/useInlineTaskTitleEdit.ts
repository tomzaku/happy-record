import React from 'react';
import { useChecklist, useChecklistTemplates } from '@dreamer/global';

type Params = {
  checklist: ReturnType<typeof useChecklist>['checklist'];
  checklistTemplate: ReturnType<typeof useChecklistTemplates>['checklistTemplate'];
  updateChecklist: ReturnType<typeof useChecklist>['updateChecklist'];
};

// The row's own edit icon (shown on hover, see ChecklistDayRow.tsx) swaps a task's title for a
// plain input instead of routing through the full task detail page for a one-word fix — pulled
// into its own hook to keep ChecklistDay.desktop.tsx under the repo's ~200-line-per-file
// guideline (CLAUDE.md's "Keep every file under ~200 lines"). Writes to the Checklist instance's
// own `title` (already what the row falls back from), not the template's, mirroring how
// `completedAt` is already a per-instance override rather than a template-level edit.
export const useInlineTaskTitleEdit = ({ checklist, checklistTemplate, updateChecklist }: Params) => {
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = React.useState('');

  const startEditingTitle = (taskId: string, currentTitle: string) => {
    setEditingTaskId(taskId);
    setEditingTitleValue(currentTitle);
  };

  const cancelEditingTitle = () => setEditingTaskId(null);

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

  return {
    editingTaskId,
    editingTitleValue,
    setEditingTitleValue,
    startEditingTitle,
    cancelEditingTitle,
    commitEditingTitle,
  };
};
