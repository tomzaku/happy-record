// `checkPermission` functions for the `notes` resource — the app-layer authorization decisions
// that used to be Postgres RLS policies (see CLAUDE.md and `shared/authorize.ts`'s own header
// for why this moved). Each handler in `../api/` is `compose(one of these, its own core)`.
// Analogous to kakaonline core-server's `accessControlMiddleware` + per-handler
// `user.hasPermission(...)` check, minus the framework: here the "check" is its own function so
// it can be composed in explicitly per route rather than living inline at the top of a handler.

import { ApiError } from '../../../shared/cors.ts';
import { ForbiddenError } from '../../../shared/authorize.ts';
import {
  fetchChallengeParticipantRow,
  fetchFieldGroupTemplateId,
  fetchNoteRow,
  fetchNoteRowsByIds,
  publicFieldGroupOwnerIds,
  type NoteRow,
} from '../repository/notes-repository.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { body, type Ctx } from '../api/notes-context.ts';

export type { NoteRow };

/** A note is readable by its owner, or by anyone at all if it's a field-group's Home note on a
 * template that's genuinely public — the app-layer equivalent of what used to be
 * 20260830010000_public_field_group_notes.sql's RLS policy, decided here instead. */
function isReadable(row: NoteRow, userId: string, publicGroupIds: Set<string>): boolean {
  if (row.user_id === userId) return true;
  return row.owner_type === 'field_group' && publicGroupIds.has(row.owner_id as string);
}

/** For `GET /notes/:id` — loads the row (there's nothing to authorize without it) and decides
 * whether this caller may see it. 404 for a missing id, 403 for one that exists but isn't this
 * caller's and isn't a public field-group note — either way the handler's own core never has to
 * touch the database again, it just maps the row this already loaded. */
export async function checkReadNote({ db, userId, id }: Ctx): Promise<NoteRow> {
  if (!id) throw new ApiError(400, 'Missing id.');
  const row = await fetchNoteRow(db, id);
  if (!row) throw new ApiError(404, 'Note not found.');
  const publicGroupIds =
    row.owner_type === 'field_group' ? await publicFieldGroupOwnerIds(db, [row.owner_id as string]) : new Set<string>();
  if (!isReadable(row, userId, publicGroupIds)) throw new ForbiddenError();
  return row;
}

/** For `GET /notes ?ids=` — a batch read silently drops whatever this caller isn't allowed to
 * see rather than failing the whole call, same "unknown/forbidden ids just don't appear" shape
 * the single-id lookup's 404/403 split would be overkill for here (the standalone notebook's own
 * listing calls this with note-type fields' ids it already trusts, mixed with the occasional
 * stale one). */
export async function checkReadNotes({ db, userId, url }: Ctx): Promise<NoteRow[]> {
  const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
  if (!ids.length) return [];
  const rows = await fetchNoteRowsByIds(db, ids);

  const candidateGroupIds = rows
    .filter(r => r.owner_type === 'field_group' && r.user_id !== userId)
    .map(r => r.owner_id as string);
  const publicGroupIds = await publicFieldGroupOwnerIds(db, candidateGroupIds);

  return rows.filter(r => isReadable(r, userId, publicGroupIds));
}

/** Whether `userId` is a genuine participant (or the owner, via the owner's own auto-enrolled
 * row) of the challenge running on the template `fieldGroupId` belongs to — not just "the
 * template is public," the same narrower bar `challenges`' own roster visibility uses. A
 * field-group with no template, or a template with no challenge at all, resolves to `false`. */
async function isFieldGroupParticipant(db: SupabaseClient, fieldGroupId: string, userId: string): Promise<boolean> {
  const templateId = await fetchFieldGroupTemplateId(db, fieldGroupId);
  if (!templateId) return false;
  return !!(await fetchChallengeParticipantRow(db, templateId, userId));
}

export type WriteAuthorization = { entry: Record<string, unknown>; existing: NoteRow | null; ownerUserId: string };

/** For `POST /notes` — parses the body (has to happen exactly once, `req.json()` can't be read
 * twice, so the handler's own core receives the already-parsed `entry` rather than re-reading the
 * request) and, for an edit of an existing row, confirms this caller may write it: its own owner,
 * always; otherwise, only if it's a field-group's own note and this caller is a real participant
 * of the challenge running on that group's template — that note is shared/collaborative content
 * once a challenge exists (the "how to do it" instructions everyone in the challenge sees and can
 * refine), not the owner's private one, mirroring `isReadable`'s own field-group carve-out but
 * narrowed to actual participation rather than "the template is public." A new id has nothing to
 * check yet — it becomes this caller's own row the moment the core upserts it.
 *
 * `ownerUserId` is who the row's `user_id` should stay as after this write: the existing row's own
 * owner when editing (so a participant's edit doesn't quietly seize ownership of the owner's
 * field-group note), or this caller for a genuinely new note. */
export async function checkWriteNote({ req, db, userId }: Ctx): Promise<WriteAuthorization> {
  const note = (await body(req)).note;
  if (!note || typeof note !== 'object') throw new ApiError(400, 'Missing note.');
  const id = (note as Record<string, unknown>).id;
  const existing = typeof id === 'string' && id ? await fetchNoteRow(db, id) : null;

  if (existing && existing.user_id !== userId) {
    const editableAsParticipant =
      existing.owner_type === 'field_group' && (await isFieldGroupParticipant(db, existing.owner_id as string, userId));
    if (!editableAsParticipant) throw new ForbiddenError();
  }

  const ownerUserId = (existing?.user_id as string | undefined) ?? userId;
  return { entry: note as Record<string, unknown>, existing, ownerUserId };
}

/** For `DELETE /notes/:id` — a missing row authorizes a no-op delete (idempotent, matches the
 * rest of this app's "deleting what isn't there is a 200" convention); an existing row that isn't
 * this caller's own is a 403, not a silent no-op. */
export async function checkDeleteNote({ db, userId, id }: Ctx): Promise<NoteRow | null> {
  if (!id) throw new ApiError(400, 'Missing id.');
  const existing = await fetchNoteRow(db, id);
  if (existing && existing.user_id !== userId) throw new ForbiddenError();
  return existing;
}
