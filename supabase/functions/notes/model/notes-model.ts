// Read-side row mapping for the `notes` resource — the `notes` feature's own model. The write
// side (`fromNote`) and the text-extraction it shares with `checklist-records` live in
// `_shared/notes.ts` instead, since those are genuinely reached from outside this feature — see
// that file's own header. Nothing outside `notes` reads a row back into wire shape, so this half
// stays local. See packages/global/src/store/note/useNote.tsx for the client shape (`Note`) this
// mirrors.

import type { OwnerType } from '../../_shared/notes.ts';

/** The full row — used for an id/ids fetch (the caller actually wants to open this note in an
 * editor). `search_text` never leaves this file — nothing client-side reads it; it exists purely
 * for `?q=`'s own server-side `ilike` match. */
export function toNote(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    value: r.value as string,
    title: (r.title as string) ?? '',
    preview: (r.preview as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    // Absent entirely for a plain note with no field/field-group behind it, same convention as
    // `folderId`/`checklistId` below — never `null` on the wire.
    ...(r.owner_type ? { ownerType: r.owner_type as OwnerType } : {}),
    ...(r.owner_id ? { ownerId: r.owner_id as string } : {}),
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
    ...(r.checklist_id ? { checklistId: r.checklist_id as string } : {}),
    ...(r.checklist_template_id ? { checklistTemplateId: r.checklist_template_id as string } : {}),
    ...(r.submission_id ? { submissionId: r.submission_id as string } : {}),
  };
}

/** Everything a note list row needs — title, preview, dates, and enough owner info to resolve a
 * folder/link — deliberately not `value`: a note's raw content can be large (embeds, long
 * documents), and a page rendering every note the user owns just to show a title and a short
 * preview has no reason to pull all of that over the wire. Used for the unscoped "every note"
 * read and `?q=` search results; `notes/api/list-notes-handler.ts` selects only these columns for
 * both, so this isn't just a narrower *response* shape, the query itself never reads `value` off
 * disk for them. */
export function toNoteSummary(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    title: (r.title as string) ?? '',
    preview: (r.preview as string) ?? '',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    ...(r.owner_type ? { ownerType: r.owner_type as OwnerType } : {}),
    ...(r.owner_id ? { ownerId: r.owner_id as string } : {}),
    ...(r.folder_id ? { folderId: r.folder_id as string } : {}),
    ...(r.checklist_id ? { checklistId: r.checklist_id as string } : {}),
    ...(r.checklist_template_id ? { checklistTemplateId: r.checklist_template_id as string } : {}),
    ...(r.submission_id ? { submissionId: r.submission_id as string } : {}),
  };
}
