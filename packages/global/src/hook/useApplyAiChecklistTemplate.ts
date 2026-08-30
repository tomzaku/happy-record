// Turns an AI-generated proposal (see aiChecklistTemplateApi.ts /
// supabase/functions/ai-checklist-template) into real store writes — shared by both entry points
// (the task detail page's "add to this template" and the Home tab's "generate a new template")
// so neither re-derives the field-reuse/group-building logic on its own.

import { v4 } from 'uuid';
import { useChecklist } from '../store/checklists/useChecklists';
import { useChecklistTemplates, type ChecklistTemplate, type FieldGroup } from '../store/checklists/useChecklistTemplates';
import { useFieldGroups } from '../store/checklists/useFieldGroups';
import { useRecordField } from '../store/record-field/useRecordField';
import { useTags } from '../store/tags/useTags';
import { useNote } from '../store/note/useNote';
import { buildEditorJsDocument } from '../lib/editorJsNoteBlocks';
import type {
  AiGeneratedChecklistTemplate,
  AiGeneratedGroup,
} from '../store/checklists/aiChecklistTemplateApi';

// The AI returns a short sequence of typed blocks for a group's note (see ai-checklist-template's
// prompt and its own GeneratedNoteBlock) — headings, quotes, and a YouTube embed are tools the
// note editor already has installed and working (@editorjs/header, @editorjs/quote,
// @editorjs/embed), so a generated note can use them instead of always being a single paragraph.
// The block-shape mapping itself (AiGeneratedNoteBlock → real Editor.js block data) is shared
// with ai-note's own note generation — see lib/editorJsNoteBlocks.ts for the full rationale.
const buildNoteFromBlocks = buildEditorJsDocument;

export const useApplyAiChecklistTemplate = () => {
  const { addChecklistTemplate, updateChecklistTemplate } = useChecklistTemplates();
  const { addFieldGroup } = useFieldGroups();
  const { addChecklist } = useChecklist();
  const { getAllRecordFields, addRecordField } = useRecordField();
  const { addTag } = useTags();
  // A generated group's own note lives in `notes` now, not on `FieldGroup` itself (see
  // useNote.tsx) — applyFieldGroups below writes it as its own row, once per group that got real
  // content, before that group's own row is created (so its `noteId` can be set up front, unlike
  // phase 1's now-removed two-step "save the template, then attach notes to it" dance — a
  // field-group row never needs a checklistTemplateId to have a note, only `notes` did).
  const { createNote } = useNote();

  /**
   * The AI proposes tags as plain strings, not registry ids — unlike TagInput's
   * `handleAddTag`, nothing here ever calls `addTag` on its own. Without this, a
   * generated template's `tags` array is set directly (below) and the tag exists on
   * the template but never in the registry the home page's Filter by Tag dropdown
   * reads from (`useTags().getAllTags()`) — see CLAUDE.md's tags note. `addTag`
   * itself already dedupes by name, so re-applying the same tags twice is a no-op.
   */
  const registerTags = (tags: string[]) => {
    tags.forEach(tag => addTag(tag));
  };

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
        ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
      });
      existing.push(created);
      return created.id;
    });
  };

  /**
   * Writes each proposed group as its own real row (see useFieldGroups.tsx) — `startPosition` is
   * where they land relative to whatever's already on the template (0 for a brand-new one, the
   * existing group count for an append). Returns the created rows so both call sites below can
   * hand back a `ChecklistTemplate` whose `.fieldGroups` already reflects them, not just wait for
   * the next render's own fetch-merge to catch up.
   *
   * A group's id is generated here, up front — not left to `addFieldGroup`'s own default — so a
   * proposed note (see createNote's `owner*` params, 20260829020000_notes_title_search_owner.sql)
   * can record it as the note's owner before the group's own row exists at all. `async`, and each
   * group's own `createNote` is awaited before its `addFieldGroup` — `field_groups.note_id` is a
   * real FK, so the note has to actually exist server-side before the group referencing it is
   * written (see createNote's own comment); groups themselves are independent of each other, so
   * this still runs them concurrently via `Promise.all` rather than one at a time.
   */
  const applyFieldGroups = (
    checklistTemplateId: string,
    groups: AiGeneratedGroup[],
    startPosition: number,
  ): Promise<FieldGroup[]> =>
    Promise.all(
      groups.map(async (group, i) => {
        const fieldGroupId = v4();
        const value = buildNoteFromBlocks(group.note);
        const noteId = value
          ? (await createNote(
            value,
            { ownerType: 'field_group', ownerId: fieldGroupId, checklistTemplateId },
            group.title,
          )).id
          : undefined;
        return addFieldGroup({
          id: fieldGroupId,
          checklistTemplateId,
          title: group.title,
          // No overrides — an AI-generated group's fields start exactly as the (possibly reused)
          // field itself already is; overriding is a manual per-group customization, not something
          // the AI proposes.
          fields: resolveFieldIds(group.fields).map(fieldId => ({ fieldId })),
          position: startPosition + i,
          ...(noteId ? { noteId } : {}),
          ...(group.repeat ? { repeat: group.repeat } : {}),
        });
      }),
    );

  /** Home tab entry point: a whole new template, plus today's checklist instance — same two
   * calls packages/create-checklist-page-ui/src/createTaskUtil.ts's createTask makes for a
   * repeat-less ("forever") task, since an AI template never sets its own template-level
   * `repeat` — day-gating lives on each group instead. `async` because `applyFieldGroups` now
   * is — see that function's own comment. */
  const applyAsNewTemplate = async (generated: AiGeneratedChecklistTemplate) => {
    registerTags(generated.tags);
    const { id } = addChecklistTemplate({
      title: generated.title,
      avatar: { type: 'icon', name: generated.avatar.name, color: generated.avatar.color },
      records: [],
      fieldGroups: [],
      tags: generated.tags,
    });
    await applyFieldGroups(id, generated.fieldGroups, 0);
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
   * Returns the merged template, `.fieldGroups` included — `useFieldGroups`' own store won't
   * reflect this write until its next render, and detail-task-page keeps its own mirrored
   * `useState` (see index.desktop.tsx), so the caller needs the value directly, not a re-read.
   * `async` because `applyFieldGroups` now is — see that function's own comment.
   */
  const applyToExistingTemplate = async (
    template: ChecklistTemplate,
    generated: AiGeneratedChecklistTemplate,
    options: { applyAvatarAndTags?: boolean } = {},
  ): Promise<ChecklistTemplate> => {
    if (options.applyAvatarAndTags) registerTags(generated.tags);
    const merged: ChecklistTemplate = {
      ...template,
      ...(options.applyAvatarAndTags
        ? {
          avatar: { ...template.avatar, name: generated.avatar.name, color: generated.avatar.color },
          tags: generated.tags,
        }
        : {}),
    };
    updateChecklistTemplate(merged);
    const newGroups = await applyFieldGroups(template.id, generated.fieldGroups, template.fieldGroups.length);
    return { ...merged, fieldGroups: [...template.fieldGroups, ...newGroups] };
  };

  return { applyAsNewTemplate, applyToExistingTemplate };
};
