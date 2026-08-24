// Turns an AI-generated proposal (see aiChecklistTemplateApi.ts /
// supabase/functions/ai-checklist-template) into real store writes — shared by both entry points
// (the task detail page's "add to this template" and the Home tab's "generate a new template")
// so neither re-derives the field-reuse/group-building logic on its own.

import { v4 } from 'uuid';
import { useChecklist } from '../store/checklists/useChecklists';
import { useChecklistTemplates, type ChecklistTemplate, type FieldGroup } from '../store/checklists/useChecklistTemplates';
import { useRecordField } from '../store/record-field/useRecordField';
import { useTags } from '../store/tags/useTags';
import type {
  AiGeneratedChecklistTemplate,
  AiGeneratedGroup,
  AiGeneratedNoteBlock,
} from '../store/checklists/aiChecklistTemplateApi';

/**
 * `FieldGroup.note` is an Editor.js `OutputData` document, NOT a Yoopta document — despite
 * `ChecklistFieldGroupView`'s own `as YooptaContentValue` cast suggesting otherwise. That cast
 * is stale/misleading: `@moon-ui/note-editor`'s actual default export (`index.tsx`) renders
 * `EditorJs.tsx` (backed by `@editorjs/editorjs`) inside an error boundary — `YooptaEditor.tsx`,
 * `LexicalEditor.tsx` and `BlockNote.tsx` in that same package are dead, unwired alternates.
 * Confirmed empirically: a hand-built Yoopta document (matching `@yoopta/editor`'s own
 * `Blocks.buildBlockData` shape byte-for-byte) still rendered as an empty "Start writing your
 * note..." placeholder, while this shape renders the real text immediately.
 *
 * The AI returns a short sequence of typed blocks now (see ai-checklist-template's prompt and
 * its own GeneratedNoteBlock), not just plain text — headings, quotes, and a YouTube embed are
 * tools the note editor already has installed and working (@editorjs/header, @editorjs/quote,
 * @editorjs/embed), so a generated note can use them instead of always being a single paragraph.
 * `packages/global` has no dependency on `@editorjs/editorjs`'s types, so each tool's block shape
 * is reproduced structurally rather than imported — `header`'s data is `{ text, level }`,
 * `quote`'s is `{ text, caption, alignment }`, and `embed`'s (confirmed against
 * @editorjs/embed's own source, since a hand-built block skips the paste-detection flow that
 * normally derives it) is `{ service, source, embed, width, height, caption }` — `embed` is the
 * actual iframe src, `source` is the original watch URL kept only for display.
 *
 * An empty note stays `null`, same as a manually created group (see
 * ChecklistFieldGroupAddGroupDesktop's `note: null`).
 */
function buildNoteFromBlocks(blocks: AiGeneratedNoteBlock[]): unknown {
  if (blocks.length === 0) return null;

  const editorBlocks = blocks.map(block => {
    switch (block.type) {
      case 'heading':
        return { type: 'header', data: { text: block.text, level: 3 } };
      case 'quote':
        return {
          type: 'quote',
          data: { text: block.text, caption: block.caption, alignment: 'left' },
        };
      case 'video':
        return {
          type: 'embed',
          data: {
            service: 'youtube',
            source: `https://www.youtube.com/watch?v=${block.videoId}`,
            embed: `https://www.youtube.com/embed/${block.videoId}`,
            width: 580,
            height: 320,
            caption: block.caption,
          },
        };
      case 'paragraph':
      default:
        return { type: 'paragraph', data: { text: block.text } };
    }
  });

  return { time: Date.now(), blocks: editorBlocks, version: '2.31.6' };
}

export const useApplyAiChecklistTemplate = () => {
  const { addChecklistTemplate, updateChecklistTemplate } = useChecklistTemplates();
  const { addChecklist } = useChecklist();
  const { getAllRecordFields, addRecordField } = useRecordField();
  const { addTag } = useTags();

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
      });
      existing.push(created);
      return created.id;
    });
  };

  const buildFieldGroups = (groups: AiGeneratedGroup[]): FieldGroup[] =>
    groups.map(group => ({
      id: v4(),
      title: group.title,
      note: buildNoteFromBlocks(group.note),
      fields: resolveFieldIds(group.fields),
      ...(group.repeat ? { repeat: group.repeat } : {}),
    }));

  /** Home tab entry point: a whole new template, plus today's checklist instance — same two
   * calls packages/create-checklist-page-ui/src/createTaskUtil.ts's createTask makes for a
   * repeat-less ("forever") task, since an AI template never sets its own template-level
   * `repeat` — day-gating lives on each group instead. */
  const applyAsNewTemplate = (generated: AiGeneratedChecklistTemplate) => {
    const fieldGroups = buildFieldGroups(generated.fieldGroups);
    registerTags(generated.tags);
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
    if (options.applyAvatarAndTags) registerTags(generated.tags);
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
