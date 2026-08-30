// Business logic for `checklist-records`, between `api/` and
// `repository/checklist-records-repository.ts` — no real cross-user visibility decision here
// (every query is already own-row-only), but this is where the multi-table composition (the
// note-value resolution a list does, the submission/notes/records write ordering a save does)
// lives instead of `api/`.

import {
  bumpChecklistRecordUpdatedAt,
  bumpSubmission,
  fetchChecklistRecords,
  fetchNotesByIds,
  removeChecklistRecord,
  removeNote,
  updateChecklistRecordValue as updateChecklistRecordValueRow,
  updateNote as updateNoteRow,
  upsertChecklistRecords,
  upsertNotes,
  upsertSubmission,
  type ChecklistRecordsQuery,
} from '../repository/checklist-records-repository.ts';
import type { Ctx } from '../api/checklist-records-context.ts';

export type NoteInfo = { value: unknown; title: string };

export async function listChecklistRecords(
  { db, userId }: Ctx,
  opts: ChecklistRecordsQuery,
): Promise<{ rows: Record<string, unknown>[]; notesById: Map<string, NoteInfo> }> {
  const rows = await fetchChecklistRecords(db, userId, opts);

  const noteIds = rows.map(r => r.note_id).filter((id): id is string => typeof id === 'string');
  const noteRows = await fetchNotesByIds(db, userId, noteIds);

  const notesById = new Map<string, NoteInfo>();
  for (const row of noteRows) {
    let value: unknown = row.value;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        // Tolerant of a legacy plain-text value, same as noteApi.ts's own parseValue.
      }
    }
    notesById.set(row.id, { value, title: row.title ?? '' });
  }

  return { rows, notesById };
}

export async function saveChecklistRecords(
  { db, userId }: Ctx,
  input: {
    submission: { id: string; checklistId: string; checklistTemplateId: string; createdAt: string };
    noteRows: Record<string, unknown>[];
    recordRows: Record<string, unknown>[];
  },
): Promise<void> {
  await upsertSubmission(db, userId, input.submission);
  // `notes` rows first — `checklist_records.note_id` is a real FK, so the row it points at has to
  // exist before the pointer row referencing it is written.
  await upsertNotes(db, userId, input.noteRows);
  await upsertChecklistRecords(db, userId, input.recordRows);
}

export async function updateChecklistRecordValue(
  { db, userId }: Ctx,
  id: string,
  patch: Record<string, unknown>,
  now: string,
): Promise<boolean> {
  const data = await updateChecklistRecordValueRow(db, userId, id, patch);
  if (!data) return false;
  await bumpSubmission(db, userId, data.submission_id, now);
  return true;
}

export async function updateNoteRecord(
  { db, userId }: Ctx,
  id: string,
  notePatch: Record<string, unknown>,
  now: string,
): Promise<boolean> {
  const data = await updateNoteRow(db, userId, id, notePatch);
  if (!data) return false;
  await bumpChecklistRecordUpdatedAt(db, userId, id, now);
  await bumpSubmission(db, userId, data.submission_id, now);
  return true;
}

export async function deleteChecklistRecord({ db, userId }: Ctx, id: string): Promise<void> {
  await removeChecklistRecord(db, userId, id);
  await removeNote(db, userId, id);
}
