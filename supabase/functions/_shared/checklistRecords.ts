// Row mapping + validation for the `checklist-records` resource — what
// "Submit" writes. See
// packages/global/src/store/checklist-record/useChecklistRecord.ts for the
// client shape (`ChecklistRecord`) this mirrors.
//
// `value` is `number | string` on the client but split into `value_number`
// / `value_text` columns here — see the migration for why. Exactly one is
// ever set; `toChecklistRecord` picks whichever is non-null.

export const MAX_LIMIT = 5000;
export const MAX_BULK = 200;

export function limitOf(v: string | null, fallback: number, max = MAX_LIMIT): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}

export function toChecklistRecord(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    checklistId: r.checklist_id as string,
    checklistTemplateId: r.checklist_template_id as string,
    createdAt: r.created_at as string,
    fieldId: r.field_id as string,
    value: (r.value_number ?? r.value_text ?? '') as number | string,
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
    folder_id: typeof e.folderId === 'string' ? e.folderId : null,
    created_at: shared.createdAt,
    submission_id: shared.submissionId,
    // Postgres only fills the default on insert, not update — an upsert
    // has to set this explicitly every time.
    updated_at: new Date().toISOString(),
  };
}
