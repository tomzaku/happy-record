// Row mapping + validation for the `checklist-records` resource — what
// "Submit" writes. See
// packages/global/src/store/checklist-record/useChecklistRecord.ts for the
// client shape (`ChecklistRecord`) this mirrors.
//
// `value` is `number | string` on the client but split into `value_number`
// / `value_text` columns here — see the migration for why. Exactly one is
// ever set; `toChecklistRecord` picks whichever is non-null.
//
// A `type: 'note'` field's own value gets a real `checklist_records` row same as every other
// field type's — see 20260829050000_checklist_records_note_id.sql — but that row carries no value of
// its own (`value_number`/`value_text` both null) and points at the `notes` row holding the real
// content via `note_id` instead. Both rows share one id (see `fromChecklistFieldNoteEntry`
// below), so `checklist_records.id = notes.id = note_id` for a note-type entry — `toChecklistRecord`
// just needs that note's `{ value, title }` handed to it (resolved by id, see checklist-records/
// index.ts's own `resolveNotes`) to present the merged shape, rather than a second table's rows
// merged into the result set client-side.

import { fromNote } from '../../../dto/notes/notes-dto.ts';

export const MAX_LIMIT = 5000;
export const MAX_BULK = 200;

export function limitOf(v: string | null, fallback: number, max = MAX_LIMIT): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}

/** `resolvedNote` is this row's own `notes` content, already looked up by `note_id` — undefined
 * for a number/text/date/datetime row (no `note_id` to resolve), and for a note row whose lookup somehow came back
 * empty (its `notes` row is missing — shouldn't happen, but falls back to an empty note rather
 * than throwing, same "degrade, don't break" rule as everywhere else here). */
export function toChecklistRecord(
  r: Record<string, unknown>,
  resolvedNote?: { value: unknown; title: string },
) {
  const noteId = r.note_id as string | null | undefined;
  return {
    id: r.id as string,
    checklistId: r.checklist_id as string,
    checklistTemplateId: r.checklist_template_id as string,
    createdAt: r.created_at as string,
    fieldId: r.field_id as string,
    value: (noteId
      ? (resolvedNote?.value ?? '')
      : (r.value_number ?? r.value_text ?? '')) as number | string,
    ...(noteId && resolvedNote?.title ? { title: resolvedNote.title } : {}),
    // Falls back to the row's own id for anything written before this
    // column existed — each becomes its own singleton group rather than
    // colliding with unrelated rows (see toChecklistRecord's caller,
    // useChecklistRecord.ts's getChecklistRecords).
    submissionId: (r.submission_id as string) || (r.id as string),
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
    updatedAt: r.updated_at as string,
  };
}

/**
 * One entry out of a bulk submit — `{ fieldId, value }`, the shape
 * `RecordDayEdit`'s Submit button sends per field. `id` and `createdAt` are
 * assigned by the caller (client-generated, same as every other resource
 * here — see CLAUDE.md). `submissionId` is one id per Submit click, shared
 * by every field in that click — the real "these were committed together"
 * relationship; `createdAt` being identical across the batch today is
 * incidental, not what grouping relies on.
 */
export function fromRecordEntry(
  e: Record<string, unknown>,
  shared: { checklistId: string; checklistTemplateId: string; createdAt: string; submissionId: string },
) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.fieldId !== 'string' || !e.fieldId) throw new Error('Missing fieldId.');
  if (typeof e.value !== 'number' && typeof e.value !== 'string') throw new Error('Missing value.');

  return {
    id: e.id,
    checklist_id: shared.checklistId,
    checklist_template_id: shared.checklistTemplateId,
    field_id: e.fieldId,
    value_number: typeof e.value === 'number' ? e.value : null,
    value_text: typeof e.value === 'string' ? e.value : null,
    note_id: null,
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: shared.createdAt,
    submission_id: shared.submissionId,
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}

/**
 * The other kind of bulk-submit entry — a `type: 'note'` field's own value. Same `{ id, fieldId,
 * value, title? }` shape `fromRecordEntry` takes; `value` arrives as real Editor.js `OutputData`
 * (an object), not a string — `fromNote` (shared/notes.ts) needs it JSON-stringified first, same
 * boundary noteApi.ts used to own client-side before this moved server-side.
 *
 * Returns *two* rows now (see 20260829050000_checklist_records_note_id.sql): `noteRow` is the
 * real content, going into `notes`; `recordRow` is the pointer, going into `checklist_records`
 * alongside every other entry in the same batch — same id on both (`e.id`), so
 * `recordRow.note_id === noteRow.id` by construction rather than a second id this function has to
 * invent and thread through. The caller (checklist-records/index.ts's `save()`) must write
 * `noteRow` before `recordRow` — `note_id` is a real FK, and the referenced row has to exist
 * first.
 */
export function fromChecklistFieldNoteEntry(
  e: Record<string, unknown>,
  shared: { checklistId: string; checklistTemplateId: string; createdAt: string; submissionId: string },
) {
  if (typeof e.id !== 'string' || !e.id) throw new Error('Missing id.');
  if (typeof e.fieldId !== 'string' || !e.fieldId) throw new Error('Missing fieldId.');

  const noteRow = fromNote({
    id: e.id,
    value: JSON.stringify(e.value ?? null),
    title: e.title,
    ownerType: 'field',
    ownerId: e.fieldId,
    checklistId: shared.checklistId,
    checklistTemplateId: shared.checklistTemplateId,
    submissionId: shared.submissionId,
    createdAt: shared.createdAt,
  });
  const recordRow = {
    id: e.id,
    checklist_id: shared.checklistId,
    checklist_template_id: shared.checklistTemplateId,
    field_id: e.fieldId,
    value_number: null,
    value_text: null,
    note_id: e.id,
    folder_id: null,
    created_at: shared.createdAt,
    submission_id: shared.submissionId,
    updated_at: new Date().toISOString(),
  };
  return { noteRow, recordRow };
}
