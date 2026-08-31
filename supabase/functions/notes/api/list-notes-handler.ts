// `GET /notes` — the collection route, two shapes depending on the query string. A single note
// by its own id is a separate route now — see `get-note-handler.ts`'s `GET /notes/:id`.

import { compose } from '../../../shared/authorize.ts';
import { toNote, toNoteSummary } from '../../../dto/notes/notes-dto.ts';
import { checkReadNotes, type NoteRow } from '../services/notes-access-service.ts';
import { getOwnNoteForFieldGroup, listMyNotes } from '../services/notes-service.ts';
import { limitFrom, type Ctx } from './notes-context.ts';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_ALL_LIMIT = 300;
const MAX_ALL_LIMIT = 1000;

// `GET /notes ?ids=a,b` — several at once, full content, same public-note exception `GET /:id`
// has — the standalone notebook's own listing (one note per note-type field, by their ids),
// which renders each one inline. Stays a query param (a batch of ids, not one resource's own
// path), same as every other "several specific ids at once" read in this app.
const getNotesByIds = compose(checkReadNotes, async (_ctx, rows: NoteRow[]) => ({ notes: rows.map(toNote) }));

// `GET /notes ?fieldGroupId=` — this caller's own note for one field group: the owner's canonical
// one (their own row always), or a participant's own fork of it, or none yet — the client uses
// this to tell which of "mine, editable" vs. "the group's, read-only" to show (see
// notes-access-service.ts's own checkWriteNote comment on why a participant gets their own copy
// instead of editing the owner's). Own-row only, nothing to compose a `checkPermission` around.
async function getMyFieldGroupNote(ctx: Ctx) {
  const fieldGroupId = ctx.url.searchParams.get('fieldGroupId')!;
  const row = await getOwnNoteForFieldGroup(ctx, fieldGroupId);
  return { notes: row ? [toNote(row)] : [] };
}

/** The unscoped/search reads have nothing to authorize beyond "this caller's own rows" — no
 * cross-user visibility rule applies, so there's no `checkPermission` worth composing in, just an
 * explicit `user_id` filter (the thing RLS used to do implicitly for every query, now spelled out
 * once here instead).
 *
 * `?q=text&limit=` → title/search_text match, most recently updated first, summaries only.
 * `?limit=` (nothing else given) → every note this user owns, most recently updated first,
 * summaries only — note-manager-page-ui's own Notes page, which fetches a selected note's own
 * full content separately via `GET /notes/:id` once someone actually opens it. */
async function listMine(ctx: Ctx) {
  const q = ctx.url.searchParams.get('q');
  const limit = q
    ? limitFrom(ctx.url, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT)
    : limitFrom(ctx.url, DEFAULT_ALL_LIMIT, MAX_ALL_LIMIT);
  const rows = await listMyNotes(ctx, { q, limit });
  return { notes: rows.map(toNoteSummary) };
}

export async function listNotesHandler(ctx: Ctx) {
  if (ctx.url.searchParams.get('ids')) return getNotesByIds(ctx);
  if (ctx.url.searchParams.get('fieldGroupId')) return getMyFieldGroupNote(ctx);
  return listMine(ctx);
}
