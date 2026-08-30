// Route table for the `note-folders` resource.

import { listNoteFoldersHandler } from './list-note-folders-handler.ts';
import { saveNoteFolderHandler } from './save-note-folder-handler.ts';
import { deleteNoteFolderHandler } from './delete-note-folder-handler.ts';
import type { Ctx } from './note-folders-context.ts';

export const ROUTES: Record<string, (ctx: Ctx) => Promise<unknown>> = {
  'GET /': listNoteFoldersHandler,
  'POST /': saveNoteFolderHandler,
  'DELETE /': deleteNoteFolderHandler,
};

export function subPath(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.lastIndexOf('note-folders');
  return '/' + (at === -1 ? parts : parts.slice(at + 1)).join('/');
}
