// Cross-feature pieces of `notes` — not everything about the resource lives here anymore, only
// what's genuinely reached from outside the `notes` feature folder (see CLAUDE.md's
// package-per-domain reasoning, and kakaonline core-server's own `shared/dtos` for the same "only
// promote what's actually reused" line):
//
//   - `computeSearchText`/`plainTextOf` — `checklist-records/index.ts` computes a note-type
//     field's own `search_text` when it routes that entry into `notes` server-side (see
//     20260829040000_notes_via_checklist_records.sql), without owning any of the rest of the note
//     row shape.
//   - `fromNote` — `_shared/checklistRecords.ts` builds a note-type field's per-day journal-entry
//     row through this same write-side mapping, for the same reason.
//
// The read-side mapping (`toNote`/`toNoteSummary`) has no callers outside `notes` itself, so it
// lives in `notes/model/notes-model.ts` instead.

import { blockToPlainText, toBlocks } from './aiNoteGeneration.ts';

export const OWNER_TYPES = ['field', 'field_group'] as const;
export type OwnerType = (typeof OWNER_TYPES)[number];
const isOwnerType = (v: unknown): v is OwnerType => (OWNER_TYPES as readonly string[]).includes(v as string);

const MAX_SEARCH_TEXT_CHARS = 2000;
const MAX_PREVIEW_CHARS = 200;
const MAX_TITLE_CHARS = 200;

/** Plain text pulled out of a note's real Editor.js blocks — the shared extraction
 * `computeSearchText`, `preview`, and `deriveTitle` all build on, walked once per write (see
 * `fromNote`'s own comment) rather than three times. `value` is the same not-yet-stringified
 * shape `fromNote`/`fromChecklistFieldNoteEntry` both receive it in — `toBlocks` already
 * tolerates a real object, a JSON string, or neither. */
export function plainTextOf(value: unknown): string {
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

export function fromNote(e: Record<string, unknown>) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.value !== 'string') throw new Error('Missing value.');
  // Owner is optional now (20260829100000_notes_optional_owner.sql) — a plain note from the
  // Notes page's own "+" has neither. `ownerType` and `ownerId` are still a pair, though: one
  // without the other is a malformed write from somewhere, not a valid "no owner" state (that's
  // both absent, not one).
  const hasOwnerType = e.ownerType !== undefined;
  const hasOwnerId = e.ownerId !== undefined;
  if (hasOwnerType !== hasOwnerId) throw new Error('ownerType and ownerId must be set together.');
  if (hasOwnerType && !isOwnerType(e.ownerType)) throw new Error('Invalid ownerType.');
  if (hasOwnerId && (typeof e.ownerId !== 'string' || !e.ownerId)) throw new Error('Invalid ownerId.');
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
    // Computed here, not trusted from the client — see computeSearchText's own comment. Same
    // for `preview` — a note list row's own display text, stored so a list read never has to
    // touch `value`/re-derive this per render (see notes/model/notes-model.ts's toNoteSummary).
    search_text: plainText.slice(0, MAX_SEARCH_TEXT_CHARS),
    preview: plainText.slice(0, MAX_PREVIEW_CHARS),
    owner_type: hasOwnerType ? e.ownerType : null,
    owner_id: hasOwnerId ? e.ownerId : null,
    checklist_id: checklistId,
    checklist_template_id: checklistTemplateId,
    // Only ever set by checklist-records' own POST (see that function) — the "these were
    // committed together" relationship a note entry shares with its other-typed siblings from the
    // same Submit click. Absent for every other note surface.
    submission_id: typeof e.submissionId === 'string' ? e.submissionId : null,
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
