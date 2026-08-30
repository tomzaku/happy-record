// `DELETE /checklist-records/:id` — idempotent, always the caller's own row(s).

import { deleteChecklistRecord } from '../services/checklist-records-service.ts';
import type { Ctx } from './checklist-records-context.ts';

/** Deletes the `checklist_records` row first (harmless no-op if this id was never one), then
 * `notes` (harmless no-op for a plain number/text/date/datetime record's own id) —
 * `checklist_records.note_id` is `on delete set null`, so order doesn't matter for the FK, but
 * deleting the pointer before the content it points at reads more naturally than the reverse. */
export async function deleteChecklistRecordHandler(ctx: Ctx) {
  await deleteChecklistRecord(ctx, ctx.id!);
  return { ok: true };
}
