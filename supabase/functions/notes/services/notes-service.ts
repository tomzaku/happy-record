// Business logic for `notes` that isn't a permission decision — see `notes-access-service.ts`
// for those. This is where the actual read composition (search vs. "all mine") and write
// side-effects (the paired `checklist_records` bump, the paired `checklist_records` delete) live,
// between `api/` and `repository/notes-repository.ts`.

import {
  bumpChecklistRecordUpdatedAt,
  fetchNoteSummaries,
  fetchOwnNoteForFieldGroup,
  removeChecklistRecord,
  removeNote,
  upsertNote,
  type NoteRow,
  type NoteSummaryQuery,
} from '../repository/notes-repository.ts';
import { recordChecklistLog } from '../../../shared/checklistLogs.ts';
import type { Ctx } from '../api/notes-context.ts';

export function listMyNotes({ db, userId }: Ctx, opts: NoteSummaryQuery): Promise<NoteRow[]> {
  return fetchNoteSummaries(db, userId, opts);
}

/** The caller's own note for one field group — the owner's canonical one (always their own row),
 * or a participant's own fork of it if they've made one, or `null` if neither exists yet. Own-row
 * only, nothing to compose a `checkPermission` around. */
export function getOwnNoteForFieldGroup({ db, userId }: Ctx, fieldGroupId: string): Promise<NoteRow | null> {
  return fetchOwnNoteForFieldGroup(db, fieldGroupId, userId);
}

export async function saveNote({ db, userId }: Ctx, row: Record<string, unknown>): Promise<void> {
  await upsertNote(db, userId, row);

  // A journal entry (checklist_id set) has a paired `checklist_records` row — same id — whose own
  // `updated_at` needs bumping too, or that row's own last-write-wins merge on the checklist side
  // won't realize this edit (landing here, not through checklist-records' own PATCH) is newer than
  // what it already has cached. Mirrors checklist-records's own update(), which already does the
  // same thing in the other direction.
  if (row.checklist_id) {
    await bumpChecklistRecordUpdatedAt(db, userId, row.id as string, row.updated_at);
  }

  // A field-group's own "how to do it" note is content that belongs to the task itself, unlike a
  // field's own note or a day's journal entry — log every save of one (see checklistLogs.ts's own
  // header for why a logging failure can't break this write).
  if (row.owner_type === 'field_group' && row.checklist_template_id) {
    await recordChecklistLog(db, userId, {
      checklistTemplateId: row.checklist_template_id as string,
      action: 'update',
      detail: 'note_updated',
      metadata: { fieldGroupId: row.owner_id, noteId: row.id },
    });
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
