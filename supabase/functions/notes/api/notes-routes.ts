// Route table for the `notes` resource — analogous to kakaonline core-server's
// `<feature>-routes.ts`, minus Express: `subPath` strips this function's own deploy-path prefix
// (`/notes` locally, `/functions/v1/notes` deployed) so the table stays a plain method+path key
// either way. `/:id` is matched by `shared/router.ts`'s `matchRoute` — a real path segment for
// "this one resource," not `?id=` in the query string (see CLAUDE.md's "Write them as normal
// REST APIs").

import { listNotesHandler } from './list-notes-handler.ts';
import { getNoteHandler } from './get-note-handler.ts';
import { saveNoteHandler } from './save-note-handler.ts';
import { deleteNoteHandler } from './delete-note-handler.ts';
import type { Ctx } from './notes-context.ts';
import type { RouteTable } from '../../../shared/router.ts';

export const ROUTES: RouteTable<Ctx> = {
  'GET /': listNotesHandler,
  'GET /:id': getNoteHandler,
  'POST /': saveNoteHandler,
  'DELETE /:id': deleteNoteHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('notes');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
