// Business logic for `notes` that isn't a permission decision — see `notes-access-service.ts`
// for those. This is where the actual read composition (search vs. "all mine") and write
// side-effects (the paired `checklist_records` bump, the paired `checklist_records` delete) live,
// between `api/` and `repository/notes-repository.ts`.

import {
  bumpChecklistRecordUpdatedAt,
  fetchNoteSummaries,
  removeChecklistRecord,
  removeNote,
  upsertNote,
  type NoteRow,
  type NoteSummaryQuery,
} from '../repository/notes-repository.ts';
import type { Ctx } from '../api/notes-context.ts';

export function listMyNotes({ db, userId }: Ctx, opts: NoteSummaryQuery): Promise<NoteRow[]> {
  return fetchNoteSummaries(db, userId, opts);
}

/** `ownerUserId` is whoever the row's `user_id` should stay as — the existing row's own owner on
 * an edit (a challenge participant editing a field-group's shared note must not seize ownership of
 * it — see notes-access-service.ts's own `checkWriteNote`), or the caller for a genuinely new
 * note. Not always `userId` (the caller performing this write). */
export async function saveNote({ db, userId }: Ctx, row: Record<string, unknown>, ownerUserId: string): Promise<void> {
  await upsertNote(db, ownerUserId, row);

  // A journal entry (checklist_id set) has a paired `checklist_records` row — same id — whose own
  // `updated_at` needs bumping too, or that row's own last-write-wins merge on the checklist side
  // won't realize this edit (landing here, not through checklist-records' own PATCH) is newer than
  // what it already has cached. Mirrors checklist-records's own update(), which already does the
  // same thing in the other direction.
  if (row.checklist_id) {
    await bumpChecklistRecordUpdatedAt(db, userId, row.id as string, row.updated_at);
  }
}

export async function deleteNote({ db, userId, id }: Ctx, existing: NoteRow | null): Promise<void> {
  if (!existing) return;
  // The paired `checklist_records` row (same id) has to go first, explicitly —
  // `checklist_records.note_id` is `on delete set null`, but that FK action alone would leave a
  // row with `note_id`, `value_number`, and `value_text` all null at once, which fails
  // `checklist_records_value_shape`'s own CHECK and would abort this delete entirely. Deleting the
  // pointer row directly (harmless no-op for a standalone/field-group note, which never has one)
  // sidesteps that path the same way checklist-records's own remove() already does.
  await removeChecklistRecord(db, userId, id!);
  await removeNote(db, userId, id!);
}
