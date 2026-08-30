// Route table for the `notes` resource — analogous to kakaonline core-server's
// `<feature>-routes.ts`, minus Express: `subPath` strips this function's own deploy-path prefix
// (`/notes` locally, `/functions/v1/notes` deployed) so the table stays a plain method+path key
// either way.

import { listNotesHandler } from './list-notes-handler.ts';
import { saveNoteHandler } from './save-note-handler.ts';
import { deleteNoteHandler } from './delete-note-handler.ts';
import type { Ctx } from './notes-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listNotesHandler,
  'POST /': saveNoteHandler,
  'DELETE /': deleteNoteHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('notes');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
