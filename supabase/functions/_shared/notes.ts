// Row mapping + validation for the `notes` resource. See
// packages/global/src/store/note/useNote.tsx for the client shape (`Note`) this mirrors.
// `owner_type`/`owner_id` (which field or field group owns this note) are set once at creation
// and immutable after — see 20260829020000_notes_title_search_owner.sql. `checklist_id` (see
// 20260829030000_notes_checklist_history.sql) tells apart the two shapes an `owner_type: 'field'`
// note can be: unset is the field's own single current note (standalone notebook), set is one
// day's journal entry for that field inside a checklist — many rows, one per submission.
// `submission_id` (20260829040000_notes_via_checklist_records.sql) is only ever set for that
// second shape, when it was created via `checklist-records`' own POST — see that function.

import { blockToPlainText, toBlocks } from './aiNoteGeneration.ts';

export const OWNER_TYPES = ['field', 'field_group'] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];
const isOwnerType = (v: unknown): v is OwnerType => (OWNER_TYPES as readonly string[]).includes(v as string);

const MAX_SEARCH_TEXT_CHARS = 2000;
const MAX_TITLE_CHARS = 200;

/** Plain text pulled out of a note's real Editor.js blocks — the shared extraction both
 * `computeSearchText` and `deriveTitle` build on. `value` is the same not-yet-stringified shape
 * `fromNote`/`fromChecklistFieldNoteEntry` both receive it in — `toBlocks` already tolerates a
 * real object, a JSON string, or neither. */
function plainTextOf(value: unknown): string {
  return toBlocks(value)
    .map(blockToPlainText)
    .filter(Boolean)
    .join(' ');
}

/** Computed here, server-side, so every write path gets the same `search_text`, however it
 * arrives, rather than trusting whatever a client happened to compute (or not) on its own. */
export function computeSearchText(value: unknown): string {
  return plainTextOf(value).slice(0, MAX_SEARCH_TEXT_CHARS);
}

/** A note saved with no title of its own (the UI has no title field left to fill in — see
 * ChecklistFieldGeneral/ChecklistFieldGroupAdd/ChecklistFieldGroupView) gets one derived from its
 * own content instead of staying blank: the first sentence, capped at 200 chars. Falls back to a
 * flat 200-char slice when there's no sentence-ending punctuation to find one by (a single
 * run-on line), and to `''` for a genuinely empty note — nothing to derive a title from. */
function deriveTitle(plainText: string): string {
  const text = plainText.trim();
  if (!text) return '';
  const sentenceEnd = text.search(/[.!?](\s|$)/);
  const sentence = sentenceEnd === -1 ? text : text.slice(0, sentenceEnd + 1);
  return sentence.slice(0, MAX_TITLE_CHARS).trim();
}

export function toNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    value: r.value as string,
    title: (r.title as string) ?? '',
    searchText: (r.search_text as string) ?? '',
    ownerType: r.owner_type as OwnerType,
    ownerId: r.owner_id as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
    ...(r.checklist_id ? { checklistId: r.checklist_id as string } : {}),
    ...(r.checklist_template_id ? { checklistTemplateId: r.checklist_template_id as string } : {}),
    ...(r.submission_id ? { submissionId: r.submission_id as string } : {}),
  };
}

export function fromNote(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.value !== 'string') throw new Error('Missing value.');
  if (!isOwnerType(e.ownerType)) throw new Error('Invalid ownerType.');
  if (typeof e.ownerId !== 'string' || !e.ownerId) throw new Error('Missing ownerId.');
  const checklistId = typeof e.checklistId === 'string' ? e.checklistId : null;
  const checklistTemplateId = typeof e.checklistTemplateId === 'string' ? e.checklistTemplateId : null;
  if (e.ownerType === 'field_group' && !checklistTemplateId) {
    throw new Error('A field_group-owned note needs checklistTemplateId.');
  }
  if (checklistId && !checklistTemplateId) {
    throw new Error('A checklist-day note needs checklistTemplateId.');
  }

  // Walked once, shared by both derived fields below — see plainTextOf's own comment.
  const plainText = plainTextOf(e.value);

  return {
    id: e.id,
    value: e.value,
    // A title the client actually typed always wins; only a blank one falls back to
    // deriveTitle — see that function's own comment.
    title: typeof e.title === 'string' && e.title.trim() ? e.title : deriveTitle(plainText),
    // Computed here, not trusted from the client — see computeSearchText's own comment.
    search_text: plainText.slice(0, MAX_SEARCH_TEXT_CHARS),
    owner_type: e.ownerType,
    owner_id: e.ownerId,
    checklist_id: checklistId,
    checklist_template_id: checklistTemplateId,
    // Only ever set by checklist-records' own POST (see that function) — the "these were
    // committed together" relationship a note entry shares with its metric siblings from the
    // same Submit click. Absent for every other note surface.
    submission_id: typeof e.submissionId === 'string' ? e.submissionId : null,
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
