// Turns an AI-generated proposal (see aiChecklistTemplateApi.ts /
// supabase/functions/ai-checklist-template) into real store writes — shared by both entry points
// (the task detail page's "add to this template" and the Home tab's "generate a new template")
// so neither re-derives the field-reuse/group-building logic on its own.

import { v4 } from 'uuid';
import { useChecklist } from '../store/checklists/useChecklists';
import { useChecklistTemplates, type ChecklistTemplate, type FieldGroup } from '../store/checklists/useChecklistTemplates';
import { useRecordField } from '../store/record-field/useRecordField';
import type { AiGeneratedChecklistTemplate, AiGeneratedGroup } from '../store/checklists/aiChecklistTemplateApi';

/**
 * `FieldGroup.note` is a Yoopta editor document (see ChecklistFieldGroupView / NoteEditor's
 * `YooptaContentValue` — `Record<string, { id, type, value, meta }>`, each block's `value`
 * a Slate node tree), not a plain string. The AI only returns plain guidance text (see
 * ai-checklist-template's prompt), so this wraps it in the smallest valid one-paragraph
 * document by hand — `packages/global` has no dependency on `@yoopta/editor`'s types, so the
 * shape is reproduced structurally rather than imported. An empty note stays `null`, same as
 * a manually created group (see ChecklistFieldGroupAddGroupDesktop's `note: null`).
 */
function buildNoteFromText(text: string): unknown {
  if (!text.trim()) return null;
  const blockId = v4();
  return {
    [blockId]: {
      id: blockId,
      type: 'paragraph',
      value: [
        {
          id: v4(),
          type: 'paragraph',
          children: [{ text }],
        },
      ],
      meta: { order: 0, depth: 0 },
    },
  };
}

export const useApplyAiChecklistTemplate = () => {
  const { addChecklistTemplate, updateChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const { getAllRecordFields, addRecordField } = useRecordField();

  /**
   * One id per proposed field, reusing an existing field by title (case-insensitive) instead of
   * creating a duplicate — see CLAUDE.md's fields.id warning: a new field always gets its own
   * generated id (addRecordField already does this), never a hardcoded/reused literal.
   */
  const resolveFieldIds = (fields: AiGeneratedGroup['fields']): string[] => {
    const existing = getAllRecordFields();
    return fields.map(field => {
      const match = existing.find(
        e => e.title.trim().toLowerCase() === field.title.trim().toLowerCase(),
      );
      if (match) return match.id;
      const created = addRecordField({
        title: field.title,
        icon: field.icon,
        description: field.description,
        type: field.type,
        unit: field.unit,
      });
      existing.push(created);
      return created.id;
    });
  };

  const buildFieldGroups = (groups: AiGeneratedGroup[]): FieldGroup[] =>
    groups.map(group => ({
      id: v4(),
      title: group.title,
      note: buildNoteFromText(group.note),
      fields: resolveFieldIds(group.fields),
      ...(group.repeat ? { repeat: group.repeat } : {}),
    }));

  /** Home tab entry point: a whole new template, plus today's checklist instance — same two
   * calls packages/create-checklist-page-ui/src/createTaskUtil.ts's createTask makes for a
   * repeat-less ("forever") task, since an AI template never sets its own template-level
   * `repeat` — day-gating lives on each group instead. */
  const applyAsNewTemplate = (generated: AiGeneratedChecklistTemplate) => {
    const fieldGroups = buildFieldGroups(generated.fieldGroups);
    const { id } = addChecklistTemplate({
      title: generated.title,
      avatar: { type: 'icon', name: generated.avatar.name, color: generated.avatar.color },
      records: [],
      fieldGroups,
      tags: generated.tags,
    });
    addChecklist({
      title: generated.title,
      checklistTemplateId: id,
      startedAt: new Date().toISOString(),
      endedAt: new Date('2099-12-31T23:59:59.999Z').toISOString(),
    });
    return { id };
  };

  /**
   * Task detail entry point: append the proposed groups to an existing template. Never
   * replaces existing groups; `applyAvatarAndTags` is the "also apply icon & color" toggle.
   * Returns the merged template — `useChecklistTemplates`' own local state won't reflect this
   * write until its next render, and detail-task-page keeps its own mirrored `useState`
   * (see index.desktop.tsx), so the caller needs the value directly, not a re-read.
   */
  const applyToExistingTemplate = (
    template: ChecklistTemplate,
    generated: AiGeneratedChecklistTemplate,
    options: { applyAvatarAndTags?: boolean } = {},
  ): ChecklistTemplate => {
    const newGroups = buildFieldGroups(generated.fieldGroups);
    const merged: ChecklistTemplate = {
      ...template,
      fieldGroups: [...template.fieldGroups, ...newGroups],
      ...(options.applyAvatarAndTags
        ? {
          avatar: { ...template.avatar, name: generated.avatar.name, color: generated.avatar.color },
          tags: generated.tags,
        }
        : {}),
    };
    updateChecklistTemplate(merged);
    return merged;
  };

  return { applyAsNewTemplate, applyToExistingTemplate };
};
