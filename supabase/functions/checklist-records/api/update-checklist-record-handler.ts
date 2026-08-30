// `PATCH /checklist-records/:id { value?, title?, folderId? }` — edits one record's value (and,
// for a note-type field's own entry, its title) in place, always the caller's own row.

import { ApiError } from '../../../shared/cors.ts';
import { computeSearchText } from '../../../dto/notes/notes-dto.ts';
import { updateChecklistRecordValue, updateNoteRecord } from '../services/checklist-records-service.ts';
import { body, type Ctx } from './checklist-records-context.ts';

/**
 * A number/text/date/datetime field's own `value` is always `number | string`, decided the same
 * way the save handler's own `isNoteEntry` is; a note-type field's is real Editor.js `OutputData`
 * (an object) or entirely absent (a title-only edit), which reaches for `notes` instead — same id
 * as this record (see this resource's own model doc comment), so the path `id` addresses both
 * rows without the client ever needing to know there are two. That row's own
 * `checklist_records.updated_at` gets bumped alongside the content edit — `toChecklistRecord`
 * reads `updated_at` off the `checklist_records` row even for a note-type record, and the
 * client's own last-write-wins merge (useChecklistRecord.ts's getChecklistRecords) trusts that
 * timestamp to know a fetched row is actually newer than what it already has; leaving it stale
 * here would make a real content edit look like a no-op on the next fetch.
 */
export async function updateChecklistRecordHandler(ctx: Ctx) {
  if (!ctx.id) throw new ApiError(400, 'Missing id.');
  const params = await body(ctx.req);
  const now = new Date().toISOString();

  if (typeof params.value === 'number' || typeof params.value === 'string') {
    const patch: Record<string, unknown> = {
      value_number: typeof params.value === 'number' ? params.value : null,
      value_text: typeof params.value === 'string' ? params.value : null,
      updated_at: now,
    };
    if (typeof params.folderId === 'string') patch.folder_id = params.folderId;

    const found = await updateChecklistRecordValue(ctx, ctx.id, patch, now);
    if (found) return { ok: true };
  }

  if (!('value' in params) && typeof params.title !== 'string') throw new ApiError(400, 'Missing value.');
  const notePatch: Record<string, unknown> = { updated_at: now };
  if ('value' in params) {
    // Computed here, not trusted from the client — same as fromNote's own search_text.
    notePatch.search_text = computeSearchText(params.value);
    notePatch.value = JSON.stringify(params.value ?? null);
  }
  if (typeof params.title === 'string') notePatch.title = params.title;

  const found = await updateNoteRecord(ctx, ctx.id, notePatch, now);
  if (!found) throw new ApiError(404, 'Not found.');
  return { ok: true };
}
