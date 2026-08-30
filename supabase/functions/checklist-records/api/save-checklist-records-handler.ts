// `POST /checklist-records { records, checklistId, checklistTemplateId, createdAt,
// submissionId }` — bulk-writes one submit's worth of fields, always the caller's own. See this
// resource's own index.ts doc comment for the note-type-field/`submissions` shape this writes
// alongside the plain-value rows.

import { ApiError } from '../../../shared/cors.ts';
import { fromChecklistFieldNoteEntry, fromRecordEntry, MAX_BULK } from '../../../dto/checklist-records/checklist-records-dto.ts';
import { saveChecklistRecords } from '../services/checklist-records-service.ts';
import { body, type Ctx } from './checklist-records-context.ts';

/** Every field type but `note` has a plain `number | string` value (number, text, date,
 * datetime — see shared/fields.ts's own FIELD_TYPES comment); a note-type field's own entry is
 * real Editor.js `OutputData` (an object) instead — same shape-based split the update handler
 * already uses, not a `fields` table lookup. Deliberately not looking the field up: a lookup can
 * only ever be as reliable as `fields` having a row for this id, and the value's own shape
 * already says which table it belongs in unambiguously — trusting the lookup instead used to
 * fail silently closed (an id the query didn't resolve — a race, a table not yet seeded — fell
 * through to "not a note" and threw `fromRecordEntry`'s own "Missing value." on real note
 * content). */
function isNoteEntry(e: Record<string, unknown>): boolean {
  return typeof e.value !== 'number' && typeof e.value !== 'string';
}

export async function saveChecklistRecordsHandler(ctx: Ctx) {
  const params = await body(ctx.req);
  const { checklistId, checklistTemplateId, createdAt, submissionId } = params as Record<string, unknown>;
  if (typeof checklistId !== 'string' || !checklistId) throw new ApiError(400, 'Missing checklistId.');
  if (typeof checklistTemplateId !== 'string' || !checklistTemplateId) {
    throw new ApiError(400, 'Missing checklistTemplateId.');
  }
  if (typeof createdAt !== 'string' || !createdAt) throw new ApiError(400, 'Missing createdAt.');
  if (typeof submissionId !== 'string' || !submissionId) throw new ApiError(400, 'Missing submissionId.');

  const entries = Array.isArray(params.records) ? params.records : [];
  if (!entries.length) return { ok: true };
  if (entries.length > MAX_BULK) throw new ApiError(400, `At most ${MAX_BULK} records per submit.`);

  const shared = { checklistId, checklistTemplateId, createdAt, submissionId };
  // Not "metricEntries" — this covers every non-note type (number, text, date, datetime), all of
  // which share the same plain-value `checklist_records` row shape.
  const valueEntries = entries.filter(e => !isNoteEntry(e as Record<string, unknown>));
  const noteEntries = entries.filter(e => isNoteEntry(e as Record<string, unknown>));

  const recordRows: (ReturnType<typeof fromRecordEntry> | ReturnType<typeof fromChecklistFieldNoteEntry>['recordRow'])[] = [];
  const noteRows: ReturnType<typeof fromChecklistFieldNoteEntry>['noteRow'][] = [];

  if (valueEntries.length) {
    try {
      recordRows.push(...valueEntries.map(e => fromRecordEntry(e as Record<string, unknown>, shared)));
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Invalid record.');
    }
  }

  if (noteEntries.length) {
    let built: ReturnType<typeof fromChecklistFieldNoteEntry>[];
    try {
      built = noteEntries.map(e => fromChecklistFieldNoteEntry(e as Record<string, unknown>, shared));
    } catch (err) {
      throw new ApiError(400, err instanceof Error ? err.message : 'Invalid record.');
    }
    noteRows.push(...built.map(b => b.noteRow));
    recordRows.push(...built.map(b => b.recordRow));
  }

  await saveChecklistRecords(ctx, {
    submission: { id: submissionId, checklistId, checklistTemplateId, createdAt },
    noteRows,
    recordRows,
  });

  return { ok: true };
}
