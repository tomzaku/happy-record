// `GET /notes` — the collection route, two shapes depending on the query string. A single note
// by its own id is a separate route now — see `get-note-handler.ts`'s `GET /notes/:id`.

import { compose } from '../../../shared/authorize.ts';
import { toNote, toNoteSummary } from '../model/notes-model.ts';
import { checkReadNotes, type NoteRow } from '../services/notes-access-service.ts';
import { limitFrom, type Ctx } from './notes-context.ts';

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;
const DEFAULT_ALL_LIMIT = 300;
const MAX_ALL_LIMIT = 1000;

// What a list (summary) read actually needs — no `value`, no `search_text` (server-only, for
// `?q=`'s own filter, never read back). See toNoteSummary's own comment for why this matters:
// leaving `value` off the select means the query never reads a note's — potentially large —
// content off disk for a row that's only ever going to show a title and a short preview.
const SUMMARY_COLUMNS =
  'id, title, preview, owner_type, owner_id, folder_id, checklist_id, checklist_template_id, submission_id, created_at, updated_at';

// `GET /notes ?ids=a,b` — several at once, full content, same public-note exception `GET /:id`
// has — the standalone notebook's own listing (one note per note-type field, by their ids),
// which renders each one inline. Stays a query param (a batch of ids, not one resource's own
// path), same as every other "several specific ids at once" read in this app.
const getNotesByIds = compose(checkReadNotes, async (_ctx, rows: NoteRow[]) => ({ notes: rows.map(toNote) }));

/** The unscoped/search reads have nothing to authorize beyond "this caller's own rows" — no
 * cross-user visibility rule applies, so there's no `checkPermission` worth composing in, just an
 * explicit `user_id` filter (the thing RLS used to do implicitly for every query, now spelled out
 * once here instead).
 *
 * `?q=text&limit=` → title/search_text match, most recently updated first, summaries only.
 * `?limit=` (nothing else given) → every note this user owns, most recently updated first,
 * summaries only — note-manager-page-ui's own Notes page, which fetches a selected note's own
 * full content separately via `GET /notes/:id` once someone actually opens it. */
async function listMine({ db, userId, url }: Ctx) {
  const q = url.searchParams.get('q');
  let query = db.from('notes').select(SUMMARY_COLUMNS).eq('user_id', userId);
  if (q) {
    // A real substring, not user-controlled SQL: PostgREST's `.or()` filter string still needs
    // `%`/commas/parens escaped out of it, since those are syntax there, not just in the ILIKE
    // pattern itself.
    const escaped = q.replace(/[%,()]/g, char => `\\${char}`);
    const pattern = `%${escaped}%`;
    query = query
      .or(`title.ilike.${pattern},search_text.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(limitFrom(url, DEFAULT_SEARCH_LIMIT, MAX_SEARCH_LIMIT));
  } else {
    query = query
      .order('updated_at', { ascending: false })
      .limit(limitFrom(url, DEFAULT_ALL_LIMIT, MAX_ALL_LIMIT));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return { notes: ((data ?? []) as NoteRow[]).map(toNoteSummary) };
}

export async function listNotesHandler(ctx: Ctx) {
  return ctx.url.searchParams.get('ids') ? getNotesByIds(ctx) : listMine(ctx);
}
